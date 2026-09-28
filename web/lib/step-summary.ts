import { COPY } from '@/content/copy';
import { formatUsd } from '@/lib/format';
import type { TraceEvent } from '@/lib/generated/trace';
import type {
  CitationsData,
  ContextData,
  EmbedData,
  ErrorData,
  GenerateData,
  MapData,
  PromptData,
  RequestData,
  SkippedData,
  Bm25Data,
  FuseData,
  RerankData,
  VectorData,
} from '@/lib/stage-data';

// One line per step for the collapsed (phone) layout: the value you would glance at first.
export const stepSummary = (event: TraceEvent): string => {
  const data = event.data;
  if (event.status === 'skipped') return (data as SkippedData).reason;
  if (event.status === 'error' && 'error' in data) return (data as ErrorData).error.message;
  const S = COPY.summary;
  switch (event.stage) {
    case 'request': {
      const d = data as RequestData;
      return S.request(d.rate_limit.remaining_minute, d.rate_limit.limit_minute, d.budget.tier);
    }
    case 'embed_query':
      return S.embed((data as EmbedData).dims);
    case 'map_project': {
      const d = data as MapData;
      return d.error ? d.error.message : S.map(d.x.toFixed(3), d.y.toFixed(3));
    }
    case 'bm25': {
      const top = (data as Bm25Data).results[0];
      return top ? S.bm25Top(top.score.toFixed(2), top.doc_title) : S.noResults;
    }
    case 'vector': {
      const top = (data as VectorData).results[0];
      return top ? S.closest(top.distance.toFixed(4), top.doc_title) : S.noResults;
    }
    case 'rerank': {
      const d = data as RerankData;
      if (d.fallback) return d.fallback;
      const moved = d.results.slice(0, d.kept).filter((r) => r.before_rank !== r.rank);
      return S.reranked(moved.length, Math.min(d.kept, d.results.length));
    }
    case 'fuse': {
      const d = data as FuseData;
      const kept = d.results.slice(0, d.kept);
      const both = kept.filter((r) => r.from.bm25_rank !== null && r.from.vector_rank !== null);
      return kept.length ? S.fused(kept.length, both.length) : S.noResults;
    }
    case 'select_context': {
      const d = data as ContextData;
      return S.context(d.chunks.length, d.context_tokens_approx.toLocaleString('en'));
    }
    case 'prompt': {
      const d = data as PromptData;
      return S.prompt(d.input_tokens.toLocaleString('en'), formatUsd(d.worst_case_cost_usd));
    }
    case 'generate': {
      const d = data as GenerateData;
      return S.generate(d.usage.output_tokens.toLocaleString('en'), d.stop_reason ?? S.unknownStop);
    }
    case 'citations': {
      const d = data as CitationsData;
      return d.abstained ? S.abstained : S.citations(d.citations.length);
    }
    default:
      return '';
  }
};
