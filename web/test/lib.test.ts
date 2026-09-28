import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/content/copy';
import { apiUrl, fetchConfig } from '@/lib/api';
import { formatMs, formatNumber, formatTokens, formatUsd, pad2 } from '@/lib/format';
import { snippetsFor, sourceUrl } from '@/lib/snippets';
import type { ApiConfig } from '@/lib/api';
import { stepSummary } from '@/lib/step-summary';
import { defaultSettings, parseUrlState, urlSearch } from '@/lib/url-state';

import { ev } from './helpers';

describe('format', () => {
  it('formats measurements the way the pad shows them', () => {
    expect(formatMs(42)).toBe('42 ms');
    expect(formatMs(1500)).toBe('1.50 s');
    expect(formatTokens(12345)).toBe('12,345 tok');
    expect(formatUsd(0)).toBe('$0');
    expect(formatUsd(0.00001)).toBe('< $0.0001');
    expect(formatUsd(0.0042)).toBe('$0.0042');
    expect(formatUsd(1.5)).toBe('$1.50');
    expect(formatNumber(1.23456)).toBe('1.235');
    expect(formatNumber(1.23456, 1)).toBe('1.2');
    expect(pad2(3)).toBe('03');
  });
});

describe('copy helpers', () => {
  it('pluralises and fills in values', () => {
    expect(COPY.unused(1)).toBe('1 passage was not cited.');
    expect(COPY.unused(3)).toBe('3 passages were not cited.');
    expect(COPY.showCode(1)).toBe('Show the code (1 excerpt)');
    expect(COPY.showCode(2)).toBe('Show the code (2 excerpts)');
    expect(COPY.workingNote(11)).toContain('11 steps');
    expect(COPY.budgetDegraded('$16', '$20')).toContain('$16 of this month’s $20');
    expect(COPY.budgetStopped('$20')).toContain('$20');
    expect(COPY.announce('5', 'Vector search', 'done', '42 ms')).toBe(
      'Step 5, Vector search: done in 42 ms.',
    );
  });
});

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds same-origin URLs by default', () => {
    expect(apiUrl('/api/config')).toBe('/api/config');
  });

  it('returns the config or throws with the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"modes":["vector"]}')),
    );
    await expect(fetchConfig()).resolves.toEqual({ modes: ['vector'] });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    );
    await expect(fetchConfig()).rejects.toThrow('The API answered 503.');
  });
});

describe('snippets', () => {
  it('are extracted per stage and link to their lines', () => {
    const [first] = snippetsFor('vector');
    expect(first.file).toBe('api/src/highnet_rag/pipeline/search.py');
    expect(first.html).toContain('hljs-');
    expect(sourceUrl(first)).toMatch(/search\.py#L\d+-L\d+$/);
    expect(snippetsFor('unknown' as never)).toEqual([]);
  });
});

describe('url state', () => {
  const config = {
    modes: ['bm25', 'vector', 'hybrid'],
    default_mode: 'hybrid',
    top_k: { default: 5, max: 10 },
    chunk_sets: [{ name: 'small' }, { name: 'medium' }],
    max_query_chars: 10,
    live: true,
    recorded: { ks: [3, 5, 10], at: null },
  } as unknown as ApiConfig;

  it('keeps valid values and replaces invalid ones with the defaults', () => {
    expect(
      parseUrlState('?q=%20Who%20won%20the%20cup%3F&mode=bm25&k=2&chunks=small', config),
    ).toEqual({
      q: 'Who won th',
      mode: 'bm25',
      k: 2,
      chunkSet: 'small',
      rerank: false,
      agentic: false,
    });
    expect(parseUrlState('?mode=agentic&k=11&chunks=huge', config)).toEqual({
      q: '',
      mode: 'hybrid',
      k: 5,
      chunkSet: 'medium',
      rerank: false,
      agentic: false,
    });
    expect(parseUrlState('?agent=1', config).agentic).toBe(true);
    expect(parseUrlState('?rerank=1', config).rerank).toBe(true);
    expect(parseUrlState('?k=2.5', config).k).toBe(5);
    expect(parseUrlState('?k=0', config).k).toBe(5);
    // Replayed questions were recorded at k = 3, 5 and 10 only.
    const replay = { ...config, live: false };
    expect(parseUrlState('?k=2', replay).k).toBe(5);
    expect(parseUrlState('?k=10', replay).k).toBe(10);
  });

  it('falls back to the first chunk set, then to medium, when medium is missing', () => {
    expect(defaultSettings({ ...config, chunk_sets: [{ name: 'large' }] } as never).chunkSet).toBe(
      'large',
    );
    expect(defaultSettings({ ...config, chunk_sets: [] }).chunkSet).toBe('medium');
  });

  it('leaves the question out of the link until there is one', () => {
    expect(
      urlSearch({ q: '', mode: 'vector', k: 3, chunkSet: 'small', rerank: false, agentic: false }),
    ).toBe('?mode=vector&k=3&chunks=small');
    expect(
      urlSearch({ q: 'x', mode: 'hybrid', k: 5, chunkSet: 'small', rerank: true, agentic: true }),
    ).toBe('?q=x&mode=hybrid&k=5&chunks=small&rerank=1&agent=1');
  });
});

describe('step summaries', () => {
  const cases: [Parameters<typeof stepSummary>[0], string][] = [
    [ev('bm25', { reason: 'Not in this build.' }, 'skipped'), 'Not in this build.'],
    [ev('embed_query', { error: { type: 'X', message: 'Key missing' } }, 'error'), 'Key missing'],
    [
      ev('request', {
        rate_limit: { remaining_minute: 19, limit_minute: 20 },
        budget: { tier: 'normal' },
      }),
      '19 of 20 left this minute · budget normal',
    ],
    [ev('embed_query', { dims: 1024, model: 'voyage-3.5-lite' }), '1024 dimensions'],
    [ev('map_project', { x: 0.1234, y: -0.5 }), 'x 0.123, y -0.500'],
    [ev('map_project', { error: { type: 'L', message: 'No PCA' } }, 'warning'), 'No PCA'],
    [ev('vector', { results: [] }, 'warning'), 'No passages found'],
    [
      ev('vector', { results: [{ chunk_id: 7, distance: 0.12345, doc_title: 'Normans' }] }),
      '0.1235 · Normans',
    ],
    [ev('bm25', { results: [] }, 'warning'), 'No passages found'],
    [
      ev('bm25', { results: [{ chunk_id: 7, score: 9.876, doc_title: 'Oxygen' }] }),
      '9.88 · Oxygen',
    ],
    [ev('fuse', { kept: 2, results: [] }, 'warning'), 'No passages found'],
    [
      ev('fuse', {
        kept: 2,
        results: [
          { from: { bm25_rank: 1, vector_rank: 2 } },
          { from: { bm25_rank: null, vector_rank: 1 } },
          { from: { bm25_rank: 3, vector_rank: 3 } },
        ],
      }),
      '2 kept · 1 found by both searches',
    ],
    [
      ev('select_context', { chunks: [{}, {}], context_tokens_approx: 1500 }),
      '2 passages · ~1,500 tokens',
    ],
    [
      ev('prompt', { input_tokens: 1200, worst_case_cost_usd: 0.0062 }),
      '1,200 in · $0.0062 worst case',
    ],
    [
      ev('generate', { usage: { output_tokens: 33 }, stop_reason: 'end_turn' }),
      '33 out · end_turn',
    ],
    [ev('generate', { usage: { output_tokens: 1 }, stop_reason: null }), '1 out · unknown stop'],
    [ev('citations', { abstained: true, citations: [] }), 'No answer in the passages'],
    [ev('citations', { abstained: false, citations: [{}] }), '1 citation'],
    [ev('citations', { abstained: false, citations: [{}, {}] }), '2 citations'],
    [ev('agent_plan', { queries: ['a', 'b'] }), '2 searches planned'],
    [ev('agent_plan', { queries: ['a'] }), '1 search planned'],
    [ev('agent_step', {}), ''],
  ];
  it.each(cases)('%#', (event, expected) => {
    expect(stepSummary(event)).toBe(expected);
  });
});
