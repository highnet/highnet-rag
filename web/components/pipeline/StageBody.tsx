import type { TraceEvent } from '@/lib/generated/trace';
import type {
  Bm25Data,
  CitationsData,
  ContextChunk,
  ContextData,
  EmbedData,
  ErrorData,
  FuseData,
  GenerateData,
  MapData,
  PromptData,
  RequestData,
  SkippedData,
  VectorData,
} from '@/lib/stage-data';
import { Typography } from '@/components/ui/Typography';

import { Bm25View } from './stages/Bm25View';
import { CitationsView } from './stages/CitationsView';
import { ContextView } from './stages/ContextView';
import { EmbedView } from './stages/EmbedView';
import { FuseView } from './stages/FuseView';
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
  bm25?: Bm25Data;
  vector?: VectorData;
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
    case 'bm25':
      return <Bm25View data={data as Bm25Data} />;
    case 'vector':
      return <VectorView data={data as VectorData} />;
    case 'fuse':
      return <FuseView data={data as FuseData} bm25={context.bm25} vector={context.vector} />;
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
      return <CitationsView data={data as CitationsData} passages={context.chunks.size} />;
    default:
      return null;
  }
};

export { StageBody };
