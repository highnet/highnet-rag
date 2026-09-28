import { STAGE_ORDER, STAGES } from '@/content/stages';
import type { TraceEvent } from '@/lib/generated/trace';
import type { RunStatus } from '@/lib/use-trace-stream';

import { StageBody, type RunContext } from './StageBody';
import { GenerateView } from './stages/GenerateView';
import type { StepStatus } from './StatusMark';
import { StepSheet } from './StepSheet';

type StepListProps = {
  events: TraceEvent[];
  runStatus: RunStatus;
  context: RunContext;
};

// The pipeline's shape is visible before the first run; steps fill in as events arrive.
const StepList = ({ events, runStatus, context }: StepListProps) => {
  const byStage = new Map(events.map((e) => [e.stage, e]));
  const firstMissing = STAGE_ORDER.find((stage) => !byStage.has(stage));
  const stopped = runStatus !== 'running';

  return (
    <ol className="space-y-4" aria-labelledby="working-title">
      {STAGE_ORDER.map((stage, index) => {
        const event = byStage.get(stage);
        const running = !event && !stopped && stage === firstMissing;
        const status: StepStatus = event
          ? (event.status as StepStatus)
          : running
            ? 'running'
            : 'pending';
        return (
          <StepSheet
            key={stage}
            number={index + 1}
            copy={STAGES[stage]}
            status={status}
            measure={
              event ? { ms: event.ms, tokens: event.tokens, costUsd: event.cost_usd } : undefined
            }
          >
            {event && <StageBody event={event} context={context} />}
            {running && stage === 'generate' && context.streamedAnswer && (
              <GenerateView data={null} streamed={context.streamedAnswer} streaming />
            )}
          </StepSheet>
        );
      })}
    </ol>
  );
};

export { StepList };
