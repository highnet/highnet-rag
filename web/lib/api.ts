import type { CorpusMapData } from '@/lib/stage-data';

// Same origin in production (FastAPI serves the export). In `next dev`, point at uvicorn.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export type ApiConfig = {
  modes: string[];
  default_mode: string;
  top_k: { default: number; max: number };
  chunk_sets: { name: string; target_tokens: number; chunks: number }[];
  models: {
    embed: { provider: string; model: string };
    answer: { provider: string; model: string };
  };
  illustrative: boolean;
  budget: { spent_usd: number; cap_usd: number; remaining_usd: number; tier: BudgetTier };
  corpus: Record<string, string>;
  max_query_chars: number;
  agent: { max_steps: number; token_cap: number };
  // false: visitors pick a recorded question and the page replays its run (no model call).
  live: boolean;
  questions: DemoQuestion[];
  recorded: { ks: number[]; at: string | null };
};

export type DemoQuestion = { id: string; question: string; compound: boolean };

export type BudgetTier = 'normal' | 'degraded' | 'stopped';

export const fetchConfig = async (signal?: AbortSignal): Promise<ApiConfig> => {
  const response = await fetch(apiUrl('/api/config'), { signal });
  if (!response.ok) {
    throw new Error(`The API answered ${response.status}.`);
  }
  return (await response.json()) as ApiConfig;
};

// The map of a chunk set never changes within a corpus build, so each is fetched once.
const mapCache = new Map<string, Promise<CorpusMapData>>();

export const fetchCorpusMap = (chunkSet: string): Promise<CorpusMapData> => {
  const cached = mapCache.get(chunkSet);
  if (cached) return cached;
  const request = fetch(apiUrl(`/api/corpus/map?chunk_set=${encodeURIComponent(chunkSet)}`)).then(
    async (response) => {
      if (!response.ok) throw new Error(`The API answered ${response.status}.`);
      return (await response.json()) as CorpusMapData;
    },
  );
  // A failed request is forgotten, so the next run can try again.
  request.catch(() => mapCache.delete(chunkSet));
  mapCache.set(chunkSet, request);
  return request;
};

export const clearMapCache = () => mapCache.clear();

export type CorpusDocuments = {
  chunk_sets: { name: string; target_tokens: number; overlap_tokens: number }[];
  documents: {
    id: number;
    title: string;
    source_url: string;
    chars: number;
    chunks: Record<string, number>;
  }[];
};

export type CorpusDocument = {
  id: number;
  title: string;
  source_url: string;
  text: string;
  chunk_set: string;
  chunks: { id: number; ord: number; start: number; end: number; approx_tokens: number }[];
};

const getJson = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(apiUrl(path), { signal });
  if (!response.ok) throw new Error(`The API answered ${response.status}.`);
  return (await response.json()) as T;
};

export const fetchCorpusDocuments = (signal?: AbortSignal) =>
  getJson<CorpusDocuments>('/api/corpus/documents', signal);

export const fetchCorpusDocument = (id: number, chunkSet: string, signal?: AbortSignal) =>
  getJson<CorpusDocument>(
    `/api/corpus/documents/${id}?chunk_set=${encodeURIComponent(chunkSet)}`,
    signal,
  );
