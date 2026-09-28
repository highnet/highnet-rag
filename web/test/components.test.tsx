import { fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AnswerResult } from '@/components/pipeline/AnswerResult';
import { CodeSnippet } from '@/components/pipeline/CodeSnippet';
import { StageBody } from '@/components/pipeline/StageBody';
import { StepList } from '@/components/pipeline/StepList';
import { StepSheet } from '@/components/pipeline/StepSheet';
import { Notice } from '@/components/site/Notice';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { themeScript, ThemeToggle } from '@/components/site/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { COPY } from '@/content/copy';
import { STAGE_ORDER, STAGES } from '@/content/stages';
import { snippetsFor } from '@/lib/snippets';

import { ev } from './helpers';

vi.mock('next/font/google', () => ({ Recursive: () => ({ variable: 'font-recursive' }) }));

const context = { chunks: new Map(), cited: new Set<number>(), streamedAnswer: '' };
const body = (event: ReturnType<typeof ev>) =>
  render(<StageBody event={event} context={context} />);

describe('stage bodies', () => {
  it('shows skip reasons and error messages', () => {
    body(ev('bm25', { reason: 'Arrives in milestone 2.' }, 'skipped'));
    expect(screen.getByText('Arrives in milestone 2.')).toBeInTheDocument();
    body(
      ev('embed_query', { error: { type: 'X', message: 'VOYAGE_API_KEY is not set.' } }, 'error'),
    );
    expect(screen.getByText('VOYAGE_API_KEY is not set.')).toBeInTheDocument();
  });

  it('renders the request, including a refusal', () => {
    body(
      ev(
        'request',
        {
          rate_limit: { remaining_minute: 0, limit_minute: 20, remaining_day: 5, limit_day: 200 },
          budget: { spent_usd: 20, cap_usd: 20, tier: 'stopped' },
          models: { embed: { model: 'e' }, answer: { model: 'a' } },
          error: { type: 'budget_exhausted', message: 'Budget used up.' },
        },
        'error',
      ),
    );
    expect(screen.getByText('Budget used up.')).toBeInTheDocument();
    expect(screen.getByText(/0\/20 left this minute/)).toBeInTheDocument();
  });

  it('renders embedding, map, vector, prompt and generate details', () => {
    body(
      ev('embed_query', { provider: 'p', model: 'm', dims: 16, norm: 1, vector_preview: [0.5] }),
    );
    expect(screen.getByText(/0\.5000, … 8 more/)).toBeInTheDocument();
    body(ev('map_project', { x: 1, y: 2, explained_variance: [0.1, 0.05], neighbours_2d: [3] }));
    expect(screen.getByText(/15\.0%/)).toBeInTheDocument();
    body(ev('map_project', { error: { type: 'L', message: 'No PCA stored' } }, 'warning'));
    expect(screen.getByText('No PCA stored')).toBeInTheDocument();
    body(
      ev('vector', {
        metric: 'cosine',
        chunk_set: 'medium',
        searched: 9,
        results: [{ chunk_id: 4, rank: 1, distance: 0.2 }],
      }),
    );
    expect(screen.getByText('Passage')).toBeInTheDocument();
    body(
      ev(
        'prompt',
        {
          provider: 'p',
          model: 'm',
          max_tokens: 10,
          system: 'Be exact.',
          messages: [],
          input_tokens: 5,
          worst_case_cost_usd: 1,
          error: { type: 'budget_guard', message: 'Could overspend.' },
        },
        'error',
      ),
    );
    expect(screen.getByText('Could overspend.')).toBeInTheDocument();
    fireEvent.click(screen.getByText(COPY.showPrompt));
    expect(screen.getByText(/"max_tokens": 10/)).toBeInTheDocument();
    body(ev('generate', { error: { type: 'R', message: 'stream dropped' } }, 'error'));
    expect(screen.getByText('stream dropped')).toBeInTheDocument();
    body(
      ev('generate', {
        provider: 'p',
        model: 'm',
        stop_reason: null,
        answer: 'France.',
        usage: { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 0 },
      }),
    );
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('renders citation outcomes', () => {
    body(ev('citations', { abstained: true, citations: [], blocks: [], unused_chunk_ids: [] }));
    expect(screen.getByText(COPY.abstained)).toBeInTheDocument();
    body(ev('citations', { abstained: false, citations: [], blocks: [], unused_chunk_ids: [1] }));
    expect(screen.getByText(COPY.noCitations)).toBeInTheDocument();
    expect(screen.getByText(COPY.unused(1))).toBeInTheDocument();
  });

  it('renders nothing for stages without a view', () => {
    const { container } = body(ev('agent_plan', {}));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('step sheets on phones', () => {
  it('fold to one line and expand on tap', () => {
    globalThis.__wide = false;
    render(
      <ol>
        <StepSheet
          number={5}
          copy={STAGES.vector}
          status="error"
          summary="Closest: Normans"
          snippets={snippetsFor('vector')}
          measure={{ ms: 4, tokens: 0, costUsd: 0 }}
        >
          <p>details</p>
        </StepSheet>
      </ol>,
    );
    const row = screen.getByRole('button', { name: /Vector search/ });
    expect(within(row).getByText('Closest: Normans')).toBeInTheDocument();
    expect(screen.queryByText('details')).not.toBeInTheDocument();
    fireEvent.click(row);
    expect(screen.getByText('details')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Show the code/));
    expect(screen.getAllByText(/classic\.py:\d+–\d+/).length).toBeGreaterThan(0);
    fireEvent.click(row);
    expect(screen.queryByText('details')).not.toBeInTheDocument();
  });

  it('let you read why a step exists before any run', () => {
    globalThis.__wide = false;
    render(
      <ol>
        <StepSheet number={1} copy={STAGES.request} status="pending" snippets={[]} />
        <StepSheet number={4} copy={STAGES.bm25} status="skipped" summary="skipped" snippets={[]} />
      </ol>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Check the request/ }));
    expect(screen.getAllByText(STAGES.request.why).length).toBeGreaterThan(0);
  });

  it('show the running step and the streaming answer', () => {
    globalThis.__wide = true;
    const done = STAGE_ORDER.slice(0, 9).map((stage) => ev(stage, { reason: 'x' }, 'skipped'));
    render(
      <StepList
        events={done}
        runStatus="running"
        context={{ ...context, streamedAnswer: 'Nor' }}
      />,
    );
    expect(screen.getAllByText(COPY.status.running)).toHaveLength(1);
    expect(screen.getByText('Nor')).toBeInTheDocument();
  });

  it('mark a failed step on wide screens', () => {
    globalThis.__wide = true;
    render(
      <ol>
        <StepSheet number={2} copy={STAGES.embed_query} status="error" snippets={[]} />
      </ol>,
    );
    expect(screen.getByRole('article')).toHaveClass('border-destructive');
  });

  it('render the narrow layout on the server', () => {
    const html = renderToStaticMarkup(
      <ol>
        <StepSheet number={1} copy={STAGES.request} status="ok" summary="ok" snippets={[]} />
      </ol>,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(renderToStaticMarkup(<ThemeToggle />)).toContain(COPY.theme.toDark);
  });
});

describe('result and code', () => {
  it('links citations and tolerates unknown ranks', () => {
    render(
      <AnswerResult
        done={null}
        citations={{
          abstained: false,
          unused_chunk_ids: [],
          citations: [
            { block: 0, chunk_id: 7, doc_title: 'Normans', rank: 1, cited_text: 'France' },
          ],
          blocks: [
            { text: 'In France.', cited: true, citation_ids: [1] },
            { text: ' Orphan.', cited: true, citation_ids: [9] },
          ],
        }}
      />,
    );
    expect(screen.getByLabelText('Source 1')).toHaveAttribute('href', '#chunk-7');
    expect(screen.getByLabelText('Source 9')).toHaveAttribute('href', '#chunk-');
    expect(screen.queryByText(/Total/)).not.toBeInTheDocument();
  });

  it('renders no code block when a stage has no excerpt', () => {
    const { container } = render(<CodeSnippet snippets={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('site chrome and primitives', () => {
  it('renders header, footer, notices and buttons', () => {
    render(
      <>
        <SiteHeader />
        <SiteFooter />
        <Notice tone="warning">careful</Notice>
        <Notice tone="error">broken</Notice>
        <Notice>note</Notice>
        <Button>plain</Button>
      </>,
    );
    expect(screen.getByText(COPY.siteName)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('broken');
    expect(screen.getByText('plain')).toHaveAttribute('data-variant', 'primary');
  });

  it('toggles the theme and remembers it, even without storage', async () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: COPY.theme.toDark }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('highnet-rag-theme')).toBe('dark');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    fireEvent.click(await screen.findByRole('button', { name: COPY.theme.toLight }));
    setItem.mockRestore();
    expect(document.documentElement).not.toHaveClass('dark');
    expect(await screen.findByRole('button', { name: COPY.theme.toDark })).toBeInTheDocument();
  });

  it('applies the stored or system theme before paint', () => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('highnet-rag-theme', 'dark');
    new Function(themeScript)();
    expect(document.documentElement).toHaveClass('dark');
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('highnet-rag-theme');
    new Function(themeScript)();
    expect(document.documentElement).toHaveClass('dark'); // matchMedia stub reports a match
    document.documentElement.classList.remove('dark');
  });

  it('renders the root layout with the font and theme script', async () => {
    const { default: RootLayout, metadata, viewport } = await import('@/app/layout');
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>child</p>
      </RootLayout>,
    );
    expect(html).toContain('font-recursive');
    expect(html).toContain('highnet-rag-theme');
    expect(String(metadata.title)).toContain('highnet-rag');
    expect(viewport.themeColor).toHaveLength(2);
  });
});
