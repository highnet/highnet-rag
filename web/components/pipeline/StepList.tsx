import { STAGE_ORDER, STAGES } from '@/content/stages';
import type { TraceEvent } from '@/lib/generated/trace';
import { snippetsFor } from '@/lib/snippets';
import { stepSummary } from '@/lib/step-summary';
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
    <ol
      aria-labelledby="working-title"
      className="relative space-y-2 md:space-y-4 md:before:absolute md:before:inset-y-0 md:before:left-14 md:before:w-px md:before:bg-border lg:before:left-16"
    >
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
            summary={event ? stepSummary(event) : undefined}
            snippets={snippetsFor(stage)}
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
