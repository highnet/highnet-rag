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
import { Typography } from '@/components/ui/Typography';

import { CitationsView } from './stages/CitationsView';
import { ContextView } from './stages/ContextView';
import { EmbedView } from './stages/EmbedView';
import { GenerateView } from './stages/GenerateView';
import { MapView } from './stages/MapView';
import { PromptView } from './stages/PromptView';
import { RequestView } from './stages/RequestView';
import { SkippedView } from './stages/SkippedView';
import { VectorView } from './stages/VectorView';

export type RunContext = {
  chunks: Map<number, ContextChunk>;
  cited: Set<number>;
  streamedAnswer: string;
};

type StageBodyProps = {
  event: TraceEvent;
  context: RunContext;
};

// Stage-specific payloads are cast from `event.data`; see lib/stage-data.ts.
const StageBody = ({ event, context }: StageBodyProps) => {
  const data = event.data;
  if (event.status === 'skipped') {
    return <SkippedView reason={(data as SkippedData).reason} />;
  }
  if (event.status === 'error' && event.stage !== 'request' && event.stage !== 'prompt') {
    return <Typography color="destructive">{(data as ErrorData).error.message}</Typography>;
  }
  switch (event.stage) {
    case 'request':
      return <RequestView data={data as RequestData} />;
    case 'embed_query':
      return <EmbedView data={data as EmbedData} />;
    case 'map_project':
      return <MapView data={data as MapData} />;
    case 'vector':
      return <VectorView data={data as VectorData} titles={context.chunks} />;
    case 'select_context':
      return <ContextView data={data as ContextData} cited={context.cited} />;
    case 'prompt':
      return <PromptView data={data as PromptData} />;
    case 'generate':
      return (
        <GenerateView
          data={data as GenerateData}
          streamed={context.streamedAnswer}
          streaming={false}
        />
      );
    case 'citations':
      return <CitationsView data={data as CitationsData} />;
    default:
      return null;
  }
};

export { StageBody };
