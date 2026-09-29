import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CorpusPage from '@/app/corpus/page';
import { ArticleText } from '@/components/corpus/ArticleText';
import { COPY } from '@/content/copy';
import { CORPUS } from '@/content/corpus';
import type { CorpusDocument, CorpusDocuments } from '@/lib/api';
import { chunkSegments } from '@/lib/chunk-segments';

const list: CorpusDocuments = {
  chunk_sets: [
    { name: 'small', target_tokens: 100, overlap_tokens: 15 },
    { name: 'medium', target_tokens: 250, overlap_tokens: 40 },
  ],
  documents: [
    {
      id: 1,
      title: 'Normans',
      source_url: 'https://w/Normans',
      chars: 30,
      chunks: { small: 2, medium: 1 },
    },
    { id: 2, title: 'Oxygen', source_url: 'https://w/Oxygen', chars: 20, chunks: { small: 1 } },
  ],
};

const text = 'One two three. Four five six.';
const article = (id: number, chunkSet: string): CorpusDocument => ({
  id,
  title: id === 1 ? 'Normans' : 'Oxygen',
  source_url: 'https://w/x',
  text,
  chunk_set: chunkSet,
  chunks:
    chunkSet === 'small'
      ? [
          { id: 10, ord: 0, start: 0, end: 20, approx_tokens: 4 },
          { id: 11, ord: 1, start: 15, end: text.length, approx_tokens: 3 },
        ]
      : [{ id: 20, ord: 0, start: 0, end: text.length, approx_tokens: 6 }],
});

const serve = (fail?: 'list' | 'doc') =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const match = url.match(/documents\/(\d+)\?chunk_set=(\w+)/);
      if (match) {
        return fail === 'doc'
          ? new Response('', { status: 500 })
          : new Response(JSON.stringify(article(Number(match[1]), match[2])));
      }
      return fail === 'list'
        ? new Response('', { status: 503 })
        : new Response(JSON.stringify(list));
    }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('corpus page', () => {
  it('lists the articles, opens the linked one and switches article and chunk size', async () => {
    serve();
    window.history.replaceState(null, '', '/corpus/?doc=2&chunks=small');
    render(<CorpusPage />);
    expect(
      within(screen.getByRole('navigation', { name: COPY.nav.label })).getByRole('link', {
        name: 'Corpus',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('heading', { name: 'Oxygen' })).toBeInTheDocument();
    expect(screen.getByText(CORPUS.listMeta(2, 30))).toBeInTheDocument();
  });

  it('shows overlap, switches articles by list and select, and changes the chunk size', async () => {
    serve();
    render(<CorpusPage />);
    expect(await screen.findByRole('heading', { name: 'Normans' })).toBeInTheDocument();
    expect(screen.getByText(CORPUS.noOverlap(40), { exact: false })).toBeInTheDocument();
    // Oxygen has no medium chunks listed, so it reads 0.
    expect(screen.getByText(CORPUS.listMeta(0, 20))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'small' }));
    expect(await screen.findByText(CORPUS.overlap(1), { exact: false })).toBeInTheDocument();
    expect(window.location.search).toBe('?doc=1&chunks=small');
    const nav = screen.getByRole('navigation', { name: CORPUS.articlesLabel });
    fireEvent.click(within(nav).getByText('Oxygen'));
    expect(await screen.findByRole('heading', { name: 'Oxygen' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    expect(await screen.findByRole('heading', { name: 'Normans' })).toBeInTheDocument();
  });

  it('explains a failed load and retries', async () => {
    serve('list');
    render(<CorpusPage />);
    expect(await screen.findByText(/The API answered 503/)).toBeInTheDocument();
    serve();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: CORPUS.retry })));
    expect(await screen.findByRole('heading', { name: 'Normans' })).toBeInTheDocument();
  });

  it('explains a failed article, and non-Error failures', async () => {
    serve('doc');
    const { unmount } = render(<CorpusPage />);
    expect(await screen.findByText(/The API answered 500/)).toBeInTheDocument();
    unmount();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject('offline')),
    );
    render(<CorpusPage />);
    expect(await screen.findByText(CORPUS.error('offline'))).toBeInTheDocument();
  });

  it('ignores a list that arrives after leaving the page', async () => {
    let resolve: (r: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((r) => (resolve = r))),
    );
    const { unmount } = render(<CorpusPage />);
    unmount();
    await act(async () => resolve(new Response('', { status: 500 })));
  });

  it('drops an article request that is overtaken', async () => {
    serve();
    const { unmount } = render(<CorpusPage />);
    await screen.findByRole('heading', { name: 'Normans' });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_, reject) =>
            init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
          ),
      ),
    );
    fireEvent.click(screen.getByRole('radio', { name: 'small' }));
    await act(async () => unmount());
    expect(CORPUS.overlap(2)).toContain('2 places');
  });
});

describe('chunk segments', () => {
  it('cuts at every boundary and marks the overlap', () => {
    const segments = chunkSegments(article(1, 'small'));
    expect(segments.map((s) => [s.start, s.end, s.depth, s.starts])).toEqual([
      [0, 15, 1, [10]],
      [15, 20, 2, [11]],
      [20, text.length, 1, []],
    ]);
    render(<ArticleText doc={article(1, 'small')} overlapTokens={15} />);
    expect(screen.getByText(CORPUS.markerLabel(11))).toBeInTheDocument();
  });
});
