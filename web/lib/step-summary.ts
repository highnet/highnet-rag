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
  switch (event.stage) {
    case 'request': {
      const d = data as RequestData;
      return `${d.rate_limit.remaining_minute}/${d.rate_limit.limit_minute} left this minute · budget ${d.budget.tier}`;
    }
    case 'embed_query': {
      const d = data as EmbedData;
      return `${d.dims} dimensions · ${d.model}`;
    }
    case 'map_project': {
      const d = data as MapData;
      return d.error ? d.error.message : `x ${d.x.toFixed(3)}, y ${d.y.toFixed(3)}`;
    }
    case 'vector': {
      const d = data as VectorData;
      const top = d.results[0];
      if (!top) return 'No passages found';
      const title = chunks.get(top.chunk_id)?.doc_title ?? `#${top.chunk_id}`;
      return `Closest: ${title} · ${top.distance.toFixed(4)}`;
    }
    case 'select_context': {
      const d = data as ContextData;
      return `${d.chunks.length} passages · ~${d.context_tokens_approx.toLocaleString('en')} tokens`;
    }
    case 'prompt': {
      const d = data as PromptData;
      return `${d.input_tokens.toLocaleString('en')} tokens in · worst case ${formatUsd(d.worst_case_cost_usd)}`;
    }
    case 'generate': {
      const d = data as GenerateData;
      return `${d.usage.output_tokens.toLocaleString('en')} tokens out · ${d.stop_reason ?? 'unknown stop'}`;
    }
    case 'citations': {
      const d = data as CitationsData;
      if (d.abstained) return 'No answer in the passages';
      return d.citations.length === 1 ? '1 citation' : `${d.citations.length} citations`;
    }
    default:
      return '';
  }
};
