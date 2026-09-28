// Shapes of `TraceEvent.data` per stage. They mirror the payloads built in
// api/src/highnet_rag/pipeline/classic.py and are kept in step with it by the SSE fixture
// tests. Generating them from per-stage Pydantic models is still to do.

export type ProviderModel = { provider: string; model: string };

export type RequestData = {
  run_id: string;
  settings: { q: string; mode: string; k: number; chunk_set: string };
  models: { embed: ProviderModel; answer: ProviderModel };
  rate_limit: {
    remaining_minute: number;
    remaining_day: number;
    limit_minute: number;
    limit_day: number;
  };
  budget: { spent_usd: number; cap_usd: number; remaining_usd: number; tier: string };
  error?: StageError;
};

export type StageError = { type: string; message: string };

export type EmbedData = ProviderModel & {
  input_type: string;
  dims: number;
  vector_preview: number[];
  norm: number;
};

export type MapData = {
  x: number;
  y: number;
  explained_variance: [number, number];
  neighbours_2d: number[];
  error?: StageError;
};

export type RankedHit = { chunk_id: number; rank: number; doc_title: string };

export type Bm25Data = {
  fts_query: string;
  terms: string[];
  chunk_set: string;
  searched: number;
  depth: number;
  results: (RankedHit & { score: number })[];
};

export type VectorData = {
  metric: string;
  chunk_set: string;
  searched: number;
  depth: number;
  results: (RankedHit & { distance: number })[];
};

export type FusedHit = RankedHit & {
  score: number;
  from: { bm25_rank: number | null; vector_rank: number | null };
  contributions: { bm25?: number; vector?: number };
};

export type FuseData = { method: string; k: number; kept: number; results: FusedHit[] };

export type ContextChunk = {
  chunk_id: number;
  rank: number;
  doc_id: number;
  doc_title: string;
  score: number;
  approx_tokens: number;
  text: string;
};

export type ContextData = {
  top_k: number;
  ranking: 'bm25' | 'vector' | 'fuse';
  score_name: 'bm25' | 'distance' | 'rrf';
  context_tokens_approx: number;
  chunks: ContextChunk[];
};

export type PromptData = ProviderModel & {
  max_tokens: number;
  system: string;
  messages: unknown[];
  input_tokens: number;
  worst_case_cost_usd: number;
  error?: StageError;
};

export type GenerateData = ProviderModel & {
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number };
  answer: string;
};

export type CitationRef = {
  block: number;
  chunk_id: number;
  doc_title: string;
  rank: number;
  cited_text: string;
};

export type CitationsData = {
  abstained: boolean;
  citations: CitationRef[];
  blocks: { text: string; cited: boolean; citation_ids: number[] }[];
  unused_chunk_ids: number[];
};

export type SkippedData = { reason: string };

export type ErrorData = { error: StageError };
