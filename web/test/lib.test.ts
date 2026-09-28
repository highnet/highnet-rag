import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/content/copy';
import { apiUrl, fetchConfig } from '@/lib/api';
import { formatMs, formatNumber, formatTokens, formatUsd, pad2 } from '@/lib/format';
import { snippetsFor, sourceUrl } from '@/lib/snippets';
import { stepSummary } from '@/lib/step-summary';

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
    expect(first.file).toBe('api/src/highnet_rag/pipeline/classic.py');
    expect(first.html).toContain('hljs-');
    expect(sourceUrl(first)).toMatch(/classic\.py#L\d+-L\d+$/);
    expect(snippetsFor('agent_plan')).toEqual([]);
  });
});

describe('step summaries', () => {
  const chunks = new Map([[7, { chunk_id: 7, doc_title: 'Normans' } as never]]);
  const cases: [Parameters<typeof stepSummary>[0], string][] = [
    [ev('bm25', { reason: 'Not in this build.' }, 'skipped'), 'Not in this build.'],
    [ev('embed_query', { error: { type: 'X', message: 'Key missing' } }, 'error'), 'Key missing'],
    [
      ev('request', {
        rate_limit: { remaining_minute: 19, limit_minute: 20 },
        budget: { tier: 'normal' },
      }),
      '19/20 per min · budget normal',
    ],
    [ev('embed_query', { dims: 1024, model: 'voyage-3.5-lite' }), '1024 dimensions'],
    [ev('map_project', { x: 0.1234, y: -0.5 }), 'x 0.123, y -0.500'],
    [ev('map_project', { error: { type: 'L', message: 'No PCA' } }, 'warning'), 'No PCA'],
    [ev('vector', { results: [] }, 'warning'), 'No passages found'],
    [ev('vector', { results: [{ chunk_id: 7, distance: 0.12345 }] }), '0.1235 · Normans'],
    [ev('vector', { results: [{ chunk_id: 8, distance: 0.2 }] }), '0.2000 · #8'],
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
    [ev('agent_plan', {}), ''],
  ];
  it.each(cases)('%#', (event, expected) => {
    expect(stepSummary(event, chunks)).toBe(expected);
  });
});
