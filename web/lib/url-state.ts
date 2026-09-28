import type { ApiConfig } from '@/lib/api';

// The run settings live in the query string, so a trace can be shared by link:
// ?q=…&mode=hybrid&k=5&chunks=medium&rerank=1. Invalid or unknown values fall back to the
// defaults.
export type RunSettings = { mode: string; k: number; chunkSet: string; rerank: boolean };

export type UrlState = RunSettings & { q: string };

export const DEFAULT_CHUNK_SET = 'medium';

export const defaultSettings = (config: ApiConfig): RunSettings => ({
  mode: config.default_mode,
  k: config.top_k.default,
  chunkSet: config.chunk_sets.some((s) => s.name === DEFAULT_CHUNK_SET)
    ? DEFAULT_CHUNK_SET
    : (config.chunk_sets[0]?.name ?? DEFAULT_CHUNK_SET),
  rerank: false,
});

export const parseUrlState = (search: string, config: ApiConfig): UrlState => {
  const params = new URLSearchParams(search);
  const fallback = defaultSettings(config);
  const mode = params.get('mode') ?? '';
  const k = Number(params.get('k'));
  const chunkSet = params.get('chunks') ?? '';
  return {
    q: (params.get('q') ?? '').trim().slice(0, config.max_query_chars),
    mode: config.modes.includes(mode) ? mode : fallback.mode,
    k: Number.isInteger(k) && k >= 1 && k <= config.top_k.max ? k : fallback.k,
    chunkSet: config.chunk_sets.some((s) => s.name === chunkSet) ? chunkSet : fallback.chunkSet,
    rerank: params.get('rerank') === '1',
  };
};

export const urlSearch = ({ q, mode, k, chunkSet, rerank }: UrlState): string => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('mode', mode);
  params.set('k', String(k));
  params.set('chunks', chunkSet);
  if (rerank) params.set('rerank', '1');
  return `?${params.toString()}`;
};

// replaceState, not pushState: changing a knob should not fill the back button's history.
export const writeUrlState = (state: UrlState) => {
  window.history.replaceState(null, '', urlSearch(state) + window.location.hash);
};
