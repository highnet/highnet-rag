import latest from '@/lib/generated/evals-latest.json';
import type { HighnetRagEvalResults, RetrievalConfig } from '@/lib/generated/evals';

export type EvalResults = HighnetRagEvalResults;

// The published run, copied in at build time by `npm run gen:evals` (null before the first run).
export const publishedResults = latest as EvalResults | null;

export const RETRIEVAL_METRICS = ['1', '3', '5', '10', 'mrr'] as const;
export type RetrievalMetric = (typeof RETRIEVAL_METRICS)[number];

export const metricValue = (config: RetrievalConfig, metric: RetrievalMetric): number =>
  metric === 'mrr' ? config.mrr : (config.recall[metric] ?? 0);

export const findConfig = (
  configs: RetrievalConfig[],
  mode: string,
  chunkSet: string,
  rerank: boolean,
): RetrievalConfig | undefined =>
  configs.find((c) => c.mode === mode && c.chunk_set === chunkSet && c.rerank === rerank);

// Order of appearance, deduplicated: the runner writes chunk sets small to large, modes as offered.
export const distinct = (values: string[]) => [...new Set(values)];

export type Highlight = { mode: string; chunkSet: string; rerank: boolean };

// The pipeline links here with its settings (?mode=&chunks=&rerank=1) so the matching row lights up.
export const parseHighlight = (search: string): Highlight | null => {
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  const chunkSet = params.get('chunks');
  if (!mode || !chunkSet) return null;
  return { mode, chunkSet, rerank: params.get('rerank') === '1' };
};

export const evalsHref = ({ mode, chunkSet, rerank }: Highlight) => {
  const params = new URLSearchParams({ mode, chunks: chunkSet });
  if (rerank) params.set('rerank', '1');
  return `/evals/?${params.toString()}#retrieval`;
};

// A finished run's settings as a link, or nothing while no run is on the page.
export const runEvalsHref = (run: Highlight | null) => (run ? evalsHref(run) : undefined);

// The dated details file that sits next to latest.json in the repository.
export const detailsUrl = (startedAt: string) =>
  `https://github.com/highnet/highnet-rag/blob/main/evals/results/${startedAt.slice(0, 10)}.details.jsonl`;
