import { COPY } from '@/content/copy';
import { formatUsd } from '@/lib/format';
import type { TraceEvent } from '@/lib/generated/trace';
import type {
  CitationsData,
  ContextChunk,
  ContextData,
  EmbedData,
  ErrorData,
  GenerateData,
  MapData,
  PromptData,
  RequestData,
  SkippedData,
  VectorData,
} from '@/lib/stage-data';

// One line per step for the collapsed (phone) layout: the value you would glance at first.
export const stepSummary = (event: TraceEvent, chunks: Map<number, ContextChunk>): string => {
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
    case 'vector': {
      const top = (data as VectorData).results[0];
      if (!top) return S.noResults;
      const title = chunks.get(top.chunk_id)?.doc_title ?? `#${top.chunk_id}`;
      return S.closest(top.distance.toFixed(4), title);
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
