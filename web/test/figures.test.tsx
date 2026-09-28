import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Bm25Figure } from '@/components/pipeline/figures/Bm25Figure';
import { CitationGrid } from '@/components/pipeline/figures/CitationGrid';
import { ContextFigure } from '@/components/pipeline/figures/ContextFigure';
import { CostFigure } from '@/components/pipeline/figures/CostFigure';
import { DistanceFigure } from '@/components/pipeline/figures/DistanceFigure';
import { EmbedFigure } from '@/components/pipeline/figures/EmbedFigure';
import { RequestFigure } from '@/components/pipeline/figures/RequestFigure';
import { WindowFigure } from '@/components/pipeline/figures/WindowFigure';
import { COPY } from '@/content/copy';
import type {
  Bm25Data,
  CitationsData,
  ContextData,
  EmbedData,
  GenerateData,
  PromptData,
  RequestData,
  VectorData,
} from '@/lib/stage-data';

const F = COPY.figures;

const request = (spent: number, tier: string) =>
  ({
    rate_limit: { remaining_minute: 19, limit_minute: 20, remaining_day: 190, limit_day: 200 },
    budget: { spent_usd: spent, cap_usd: 20, remaining_usd: 20 - spent, degrade_at_usd: 16, tier },
  }) as RequestData;

const prompt = (window: number | null, input: number) =>
  ({
    input_tokens: input,
    max_tokens: 1024,
    context_window: window,
    parts_approx: { system: 90, passages: 1200, question: 10 },
  }) as PromptData;

describe('step figures', () => {
  it('colours the budget meter by tier and marks the degrade threshold', () => {
    for (const [spent, tier, tone] of [
      [1, 'normal', 'bg-primary'],
      [17, 'degraded', 'bg-warning'],
      [20, 'stopped', 'bg-destructive'],
    ] as const) {
      const { container, unmount } = render(<RequestFigure data={request(spent, tier)} />);
      expect(container.querySelector(`.${tone}`)).not.toBeNull();
      expect(screen.getByText('1/20')).toBeInTheDocument();
      unmount();
    }
  });

  it('draws the embedding around zero, even when every value is zero', () => {
    render(
      <EmbedFigure
        data={{ dims: 1024, vector_preview: [0, 0], norm: 0 } as unknown as EmbedData}
      />,
    );
    expect(screen.getByText(F.embed.caption(2, 1024))).toBeInTheDocument();
  });

  it('shows the window share, a tiny share, or no window at all', () => {
    const { unmount } = render(<WindowFigure data={prompt(200_000, 2_000)} />);
    expect(screen.getByText(F.window.share('1.0%'))).toBeInTheDocument();
    expect(screen.getByText('~1,200')).toBeInTheDocument();
    unmount();
    const tiny = render(<WindowFigure data={prompt(200_000, 100)} />);
    expect(screen.getByText(F.window.share('<0.1%'))).toBeInTheDocument();
    tiny.unmount();
    render(<WindowFigure data={prompt(null, 100)} />);
    expect(screen.getByText(F.window.captionNoWindow)).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'The request uses 100 input tokens: about 90 system prompt, 1,200 passages, 10 question; 1,024 reserved for the answer.',
      }),
    ).toBeInTheDocument();
  });

  it('places one or many distances on the zoomed line', () => {
    const vector = (distances: number[]) =>
      ({
        results: distances.map((distance, i) => ({ chunk_id: i, rank: i + 1, distance })),
      }) as VectorData;
    const { unmount } = render(<DistanceFigure data={vector([0.31, 0.35, 0.36])} />);
    expect(screen.getByText('0.3100')).toBeInTheDocument();
    expect(screen.getByText('0.3600')).toBeInTheDocument();
    unmount();
    render(<DistanceFigure data={vector([0.001])} />);
    expect(
      screen.getByRole('img', { name: F.distance.alt(1, '0.0010', '0.0010') }),
    ).toBeInTheDocument();
  });

  it('labels only the context segments wide enough to hold a label', () => {
    const chunk = (chunk_id: number, rank: number, approx_tokens: number) => ({
      chunk_id,
      rank,
      approx_tokens,
    });
    render(
      <ContextFigure
        data={
          {
            context_tokens_approx: 1000,
            chunks: [chunk(1, 1, 700), chunk(2, 2, 290), chunk(3, 3, 10)],
          } as unknown as ContextData
        }
        cited={new Set([1])}
      />,
    );
    expect(screen.getByText('[1]')).toBeInTheDocument();
    expect(screen.queryByText('[3]')).not.toBeInTheDocument();
    expect(screen.getByText(`${F.context.caption} ${F.context.citedNote}`)).toBeInTheDocument();
  });

  it('mentions citations in the context caption only once there are some', () => {
    render(
      <ContextFigure
        data={{ context_tokens_approx: 0, chunks: [] } as unknown as ContextData}
        cited={new Set()}
      />,
    );
    expect(screen.getByText(F.context.caption)).toBeInTheDocument();
  });

  it('lists dropped stop words only when there are some', () => {
    render(
      <Bm25Figure
        data={
          {
            searched: 10,
            words: [{ word: 'Normandy', term: 'normandy' }],
            terms: [{ term: 'normandy', chunks: 2, idf: 1.5 }],
          } as Bm25Data
        }
      />,
    );
    expect(
      screen.getByRole('img', {
        name: 'Search terms and their weights: normandy idf 1.50, in 2 of 10 chunks.',
      }),
    ).toBeInTheDocument();
  });

  it('splits a free answer into two zero-cost parts', () => {
    render(<CostFigure data={{ cost_split: { input_usd: 0, output_usd: 0 } } as GenerateData} />);
    expect(screen.getAllByText('$0')).toHaveLength(2);
  });

  it('ticks cited passages and marks unused ones', () => {
    render(
      <CitationGrid
        passages={3}
        data={
          {
            blocks: [
              { text: 'Normandy is in France.', cited: true, citation_ids: [1] },
              { text: '  ', cited: false, citation_ids: [] },
            ],
          } as CitationsData
        }
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText(F.citations.cited)).toBeInTheDocument();
    expect(screen.getAllByText(`(${F.citations.unused})`, { exact: false })).toHaveLength(2);
  });
});
