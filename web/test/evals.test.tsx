import { readFileSync } from 'node:fs';
import path from 'node:path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import EvalsPage from '@/app/evals/page';
import { EvalsReport } from '@/components/evals/EvalsReport';
import { AnswerResult } from '@/components/pipeline/AnswerResult';
import { EVALS } from '@/content/evals';
import {
  detailsUrl,
  evalsHref,
  findConfig,
  metricValue,
  parseHighlight,
  runEvalsHref,
  type EvalResults,
} from '@/lib/evals';

const full: EvalResults = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures/evals.json'), 'utf8'),
);
const retrievalOnly: EvalResults = { ...full, answers: null, compound: null };

afterEach(() => window.history.replaceState(null, '', '/'));

describe('evals page', () => {
  it('says plainly when no run has been published', () => {
    render(<EvalsReport results={null} />);
    expect(screen.getByText(EVALS.empty.title)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a full run: facts, retrieval, answers, compound and cost', () => {
    render(<EvalsReport results={full} />);
    expect(screen.getByText(EVALS.illustrative)).toBeInTheDocument();
    // The run record names every model with a cost line.
    for (const line of full.cost.by_model)
      expect(screen.getAllByText(new RegExp(line.model)).length).toBeGreaterThan(0);
    expect(screen.getByText(EVALS.lede(160, true))).toBeInTheDocument();
    // One table per chunk size, plus compound and cost.
    expect(screen.getByRole('table', { name: /Small chunks/ })).toBeInTheDocument();
    const answers = screen.getByRole('region', { name: EVALS.answers.title });
    expect(within(answers).getByText(EVALS.answers.correct)).toBeInTheDocument();
    expect(within(answers).getByText('71 of 105')).toBeInTheDocument();
    const compound = screen.getByRole('region', { name: EVALS.compound.title });
    expect(within(compound).getByText(EVALS.compound.searches)).toBeInTheDocument();
    expect(within(compound).getByText('2.5')).toBeInTheDocument();
    expect(screen.getByText(EVALS.cost.total)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: EVALS.cost.details })).toHaveAttribute(
      'href',
      detailsUrl(full.run.started_at),
    );
    expect(screen.getByText(EVALS.sets.pending)).toBeInTheDocument();
  });

  it('marks answers and compound as not measured in a retrieval-only run', () => {
    render(
      <EvalsReport results={{ ...retrievalOnly, run: { ...full.run, illustrative: false } }} />,
    );
    expect(screen.getAllByText(EVALS.notMeasured.label)).toHaveLength(2);
    expect(screen.queryByText(EVALS.illustrative)).not.toBeInTheDocument();
    expect(screen.queryByText(EVALS.cost.details)).not.toBeInTheDocument();
    expect(screen.getByText(EVALS.lede(105, false))).toBeInTheDocument();
  });

  it('switches the measure and lights up the linked configuration', () => {
    window.history.replaceState(null, '', '/evals/?mode=hybrid&chunks=medium&rerank=1');
    const configs = full.retrieval.configs.filter(
      (c) => !(c.mode === 'bm25' && c.chunk_set === 'large' && c.rerank),
    );
    render(
      <EvalsReport
        results={{
          ...retrievalOnly,
          retrieval: { ...full.retrieval, configs, unmatched: { small: 2, medium: 0, large: 1 } },
        }}
      />,
    );
    expect(screen.getAllByText(EVALS.retrieval.yours).length).toBeGreaterThan(0);
    expect(screen.getByText(EVALS.retrieval.unmatched(2, 'small'))).toBeInTheDocument();
    expect(screen.getByText(EVALS.retrieval.unmatched(1, 'large'))).toBeInTheDocument();
    const hybrid = findConfig(configs, 'hybrid', 'small', false)!;
    const cell = (metric: string, value: string) =>
      EVALS.retrieval.cellLabel(metric, value, hybrid.questions, hybrid.errors);
    expect(
      screen.getByText(cell('recall@5', EVALS.percent(metricValue(hybrid, '5')))),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'MRR' }));
    expect(screen.getByText(cell('MRR', hybrid.mrr.toFixed(2)))).toBeInTheDocument();
    // The missing configuration reads as a dash; the full table opens on demand.
    expect(screen.getAllByText('–').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(EVALS.retrieval.tableToggle));
    expect(screen.getByRole('table', { name: EVALS.retrieval.tableCaption })).toBeInTheDocument();
    expect(screen.getByText(EVALS.retrieval.timeNote)).toBeInTheDocument();
  });

  it('reads a missing faithfulness as a dash, and renders as a page', () => {
    const answers = full.answers!;
    const { unmount } = render(
      <EvalsReport
        results={{
          ...full,
          answers: { ...answers, unanswerable: { ...answers.unanswerable, faithfulness: null } },
        }}
      />,
    );
    const region = screen.getByRole('region', { name: EVALS.answers.title });
    expect(within(region).getAllByText('–').length).toBeGreaterThan(0);
    unmount();
    render(<EvalsPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(EVALS.title);
    expect(screen.getByRole('link', { name: 'Evals' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders on the server without a highlight, and names unknown modes as they are', () => {
    const configs = [{ ...full.retrieval.configs[0], mode: 'splade' }];
    const html = renderToString(
      <EvalsReport results={{ ...retrievalOnly, retrieval: { ...full.retrieval, configs } }} />,
    );
    expect(html).toContain('splade');
    expect(html).not.toContain(EVALS.retrieval.yours);
  });

  it('counts failed questions in a cell', () => {
    const configs = full.retrieval.configs.map((c) => ({ ...c, errors: 3 }));
    render(
      <EvalsReport results={{ ...retrievalOnly, retrieval: { ...full.retrieval, configs } }} />,
    );
    expect(screen.getAllByText(/, 3 failed/).length).toBeGreaterThan(0);
  });

  it('shows compound as not measured when a pipeline is missing', () => {
    render(<EvalsReport results={{ ...full, compound: [full.compound![0]] }} />);
    expect(screen.getAllByText(EVALS.notMeasured.label)).toHaveLength(1);
  });
});

describe('eval helpers and the link from the pipeline', () => {
  it('parses and builds links', () => {
    expect(parseHighlight('?mode=bm25')).toBeNull();
    expect(parseHighlight('?mode=bm25&chunks=small')).toEqual({
      mode: 'bm25',
      chunkSet: 'small',
      rerank: false,
    });
    expect(evalsHref({ mode: 'bm25', chunkSet: 'small', rerank: false })).toBe(
      '/evals/?mode=bm25&chunks=small#retrieval',
    );
    expect(evalsHref({ mode: 'bm25', chunkSet: 'small', rerank: true })).toContain('rerank=1');
    expect(runEvalsHref(null)).toBeUndefined();
    expect(metricValue({ ...full.retrieval.configs[0], recall: {} }, '5')).toBe(0);
    expect(EVALS.percent(undefined)).toBe('–');
    expect(EVALS.sets.counts(10, 0)).toBe('10 answerable');
    expect(EVALS.retrieval.chunkCaption('tiny', 40)).toBe('tiny chunks (~40 tokens)');
    expect(EVALS.retrieval.mode('x')).toBe('x');
    expect(EVALS.retrieval.configName('x', 'y', true)).toBe('x · y · rerank');
    expect(EVALS.answers.config('x', 'medium', 5, true)).toContain('reranker on');
    expect(EVALS.retrieval.unmatched(1, 'small')).toContain('1 question left');
  });

  it('links an answer to its configuration', () => {
    render(
      <AnswerResult
        citations={{ abstained: false, citations: [], blocks: [], unused_chunk_ids: [] }}
        done={null}
        evalsHref="/evals/?mode=bm25&chunks=small#retrieval"
      />,
    );
    expect(screen.getByRole('link', { name: EVALS.fromPipeline })).toHaveAttribute(
      'href',
      '/evals/?mode=bm25&chunks=small#retrieval',
    );
  });
});
