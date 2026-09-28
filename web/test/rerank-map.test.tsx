import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CorpusMap } from '@/components/pipeline/figures/CorpusMap';
import { PipelineExplorer } from '@/components/pipeline/PipelineExplorer';
import { RerankView } from '@/components/pipeline/stages/RerankView';
import { COPY } from '@/content/copy';
import { clearMapCache, fetchCorpusMap } from '@/lib/api';
import type { ContextChunk, RerankData } from '@/lib/stage-data';
import { stepSummary } from '@/lib/step-summary';

import { ControlledEventSource, ev } from './helpers';

const T = COPY.stageText;
const M = COPY.figures.map;
const baseConfig = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/config.json'), 'utf8'));

const corpusMap = {
  chunk_set: 'medium',
  explained_variance: [0.2, 0.1],
  documents: { '1': 'Normans', '2': 'Oxygen' },
  points: [
    [10, 1, 0, 0],
    [11, 1, 1, 1],
    [12, 2, 2, 2],
    [13, 2, 3, 3],
  ],
};

const respond = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => clearMapCache());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const rerank = (overrides: Partial<RerankData> = {}): RerankData => ({
  provider: 'fake',
  model: 'm',
  input: 'fuse',
  kept: 2,
  retries: 0,
  results: [
    { chunk_id: 1, rank: 1, before_rank: 3, relevance: 0.9, doc_title: 'Normans' },
    { chunk_id: 2, rank: 2, before_rank: 2, relevance: 0.5, doc_title: 'Normans' },
    { chunk_id: 3, rank: 3, before_rank: 1, relevance: 0.1, doc_title: 'Oxygen' },
  ],
  ...overrides,
});

describe('rerank step', () => {
  it('shows each move, the cut, and the candidates below it on request', () => {
    render(<RerankView data={rerank()} />);
    expect(screen.getByText(T.moved.up(2))).toBeInTheDocument();
    expect(screen.getByText(T.cut(2))).toBeInTheDocument();
    expect(screen.queryByText(T.moved.down(2))).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: T.showDropped(1) }));
    expect(screen.getByText(T.moved.down(2))).toBeInTheDocument();
    expect(screen.getByText('0.900')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: T.hideDropped }));
  });

  it('names an unknown input ranking as is, and needs no toggle when nothing was cut', () => {
    render(<RerankView data={rerank({ input: 'agent', kept: 3 })} />);
    expect(screen.getByText(T.rerank(3, 'agent'))).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('explains a failed rerank and the order it kept', () => {
    const failed = {
      error: { type: 'X', message: 'timed out.' },
      fallback: 'Kept the fuse order.',
    };
    render(<RerankView data={failed as unknown as RerankData} />);
    expect(screen.getByText('timed out. Kept the fuse order.')).toBeInTheDocument();
    expect(stepSummary(ev('rerank', failed, 'warning'))).toBe('Kept the fuse order.');
  });

  it('summarises how many of the top-k changed places', () => {
    expect(stepSummary(ev('rerank', rerank() as never))).toBe(
      T.moved.up(0) && '1 of the top 2 changed places',
    );
    const still = rerank({
      results: [{ chunk_id: 1, rank: 1, before_rank: 1, relevance: 1, doc_title: 'N' }],
    });
    expect(stepSummary(ev('rerank', still as never))).toBe('top 1 unchanged');
  });
});

describe('corpus map', () => {
  const retrieved = [{ chunk_id: 12, rank: 1, doc_title: 'Oxygen' }] as ContextChunk[];
  const draw = (query = { x: 0.5, y: 0.5 }) =>
    render(
      <CorpusMap
        chunkSet="medium"
        query={query}
        explained={[0.2, 0.1]}
        neighbours={[10, 12, 99]}
        retrieved={retrieved}
      />,
    );

  it('draws every chunk, the question and the retrieved passage, with a table behind a toggle', async () => {
    vi.stubGlobal('fetch', respond(corpusMap));
    draw();
    expect(screen.getByText(M.loading)).toBeInTheDocument();
    const map = await screen.findByRole('img', { name: /Map of 4 chunks.*\[1\] Oxygen/ });
    expect(map.querySelectorAll('circle').length).toBe(4 + 1 + 1 + 1);
    expect(screen.getByText(M.axis(1, '20.0%'), { exact: false })).toBeInTheDocument();
    expect(screen.getByText(M.caption('30.0%'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: M.showTable }));
    expect(screen.getByText(M.retrievedRow(1, 'Oxygen'))).toBeInTheDocument();
    expect(screen.getByText(M.neighbourRow('Normans'))).toBeInTheDocument();
    expect(screen.getByText('2.121')).toBeInTheDocument(); // distance from the question
    fireEvent.click(screen.getByRole('button', { name: M.hideTable }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('lights up a whole article when pointing at one of its dots', async () => {
    vi.stubGlobal('fetch', respond(corpusMap));
    draw({ x: 3, y: 3 }); // far right: the question's label flips to its left
    const map = await screen.findByRole('img', { name: /Map of 4 chunks/ });
    const svg = map.querySelector('svg') as SVGSVGElement;
    fireEvent.pointerMove(svg, { clientX: 50, clientY: 50 }); // no size yet: ignored
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    } as DOMRect);
    const dot = svg.querySelectorAll('circle')[1];
    const [cx, cy] = [Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))];
    fireEvent.pointerDown(svg, { clientX: cx, clientY: cy });
    expect(screen.getByText(M.pointed('Normans', 11))).toBeInTheDocument();
    expect(svg.querySelectorAll('circle.fill-foreground')).toHaveLength(2);
    fireEvent.pointerMove(svg, { clientX: 500, clientY: 500 }); // nowhere near a dot
    expect(screen.queryByText(M.pointed('Normans', 11))).not.toBeInTheDocument();
    fireEvent.pointerDown(svg, { clientX: cx, clientY: cy });
    // A finger lifting fires pointerleave too: the tapped article stays lit.
    const lift = createEvent.pointerLeave(svg);
    Object.defineProperty(lift, 'pointerType', { value: 'touch' });
    fireEvent(svg, lift);
    expect(screen.getByText(M.pointed('Normans', 11))).toBeInTheDocument();
    fireEvent.pointerLeave(svg);
    expect(screen.queryByText(M.pointed('Normans', 11))).not.toBeInTheDocument();
  });

  it('says so when the map cannot be loaded, and retries on the next request', async () => {
    vi.stubGlobal('fetch', respond({}, 503));
    const { unmount } = draw();
    expect(await screen.findByText(/The API answered 503/)).toBeInTheDocument();
    unmount();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject('offline')),
    );
    draw();
    expect(await screen.findByText(/offline/)).toBeInTheDocument();
  });

  it('fetches each chunk set once, and ignores an answer that arrives after unmounting', async () => {
    const fetchMock = respond(corpusMap);
    vi.stubGlobal('fetch', fetchMock);
    const first = fetchCorpusMap('medium');
    expect(fetchCorpusMap('medium')).toBe(first);
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    let reject: (reason: unknown) => void = () => undefined;
    clearMapCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise((_, r) => (reject = r))),
    );
    const { unmount } = draw();
    unmount();
    await act(async () => reject(new Error('late')));
    expect(screen.queryByText(/late/)).not.toBeInTheDocument();
  });

  it('labels a chunk without a known article by its id', async () => {
    vi.stubGlobal('fetch', respond({ ...corpusMap, documents: {} }));
    draw();
    await screen.findByRole('img', { name: /Map of 4 chunks/ });
    fireEvent.click(screen.getByRole('button', { name: M.showTable }));
    expect(screen.getByText(M.neighbourRow('#10'))).toBeInTheDocument();
  });
});

describe('reranker setting', () => {
  it('turns the reranker on, keeps it in the link and sends it with the run', async () => {
    vi.stubGlobal('EventSource', ControlledEventSource);
    ControlledEventSource.instances = [];
    vi.stubGlobal('fetch', respond(baseConfig));
    render(<PipelineExplorer />);
    await screen.findByText(COPY.settings.topK);
    expect(screen.getByText(COPY.settings.rerankDescription.off)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('radio', { name: 'on' })[0]);
    expect(screen.getByText(COPY.settings.rerankDescription.on)).toBeInTheDocument();
    expect(window.location.search).toContain('rerank=1');
    expect(screen.getByText(/· rerank/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(COPY.questionLabel), { target: { value: 'Why?' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(ControlledEventSource.last().url).toContain('rerank=true');
    act(() =>
      ControlledEventSource.last().emit('done', {
        run_id: 'r',
        status: 'ok',
        ms: 1,
        tokens: 0,
        cost_usd: 0,
      }),
    );
    fireEvent.click(screen.getAllByRole('radio', { name: 'off' })[0]);
    expect(screen.getByText(COPY.settings.changed)).toBeInTheDocument();
  });
});
