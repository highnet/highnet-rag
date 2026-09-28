import { COPY } from '@/content/copy';
import { STAGE_ORDER, STAGES } from '@/content/stages';
import { type AgentStepData, agentSearches, topLevel } from '@/lib/agent';
import type { Stage, TraceEvent } from '@/lib/generated/trace';
import { snippetsFor } from '@/lib/snippets';
import { stepSummary } from '@/lib/step-summary';
import type { RunStatus } from '@/lib/use-trace-stream';

import { StageBody, type RunContext } from './StageBody';
import type { AgentPlanData } from './stages/AgentPlanView';
import { AgentStepsView } from './stages/AgentStepsView';
import { GenerateView } from './stages/GenerateView';
import type { StepStatus } from './StatusMark';
import { StepSheet } from './StepSheet';

type StepListProps = {
  order?: Stage[];
  events: TraceEvent[];
  runStatus: RunStatus;
  context: RunContext;
};

const total = (events: TraceEvent[]) => ({
  ms: events.reduce((t, e) => t + e.ms, 0),
  tokens: events.reduce((t, e) => t + e.tokens, 0),
  costUsd: events.reduce((t, e) => t + e.cost_usd, 0),
});

// The worst state among an agent's steps; a stop at a cap reads as a warning.
const groupStatus = (events: TraceEvent[]): StepStatus =>
  events.some((e) => e.status === 'error')
    ? 'error'
    : events.some((e) => e.status === 'warning')
      ? 'warning'
      : 'ok';

// The pipeline's shape is visible before the first run; steps fill in as events arrive.
const StepList = ({ order = STAGE_ORDER, events, runStatus, context }: StepListProps) => {
  const top = topLevel(events);
  const byStage = new Map(top.map((e) => [e.stage, e]));
  const searches = agentSearches(events);
  const has = (stage: Stage) => (stage === 'agent_step' ? searches.length > 0 : byStage.has(stage));
  const firstMissing = order.find((stage) => !has(stage));
  const stopped = runStatus !== 'running';
  const plan = byStage.get('agent_plan');

  return (
    <ol
      aria-labelledby="working-title"
      className="relative space-y-2 md:space-y-4 md:before:absolute md:before:inset-y-0 md:before:left-14 md:before:w-px md:before:bg-border lg:before:left-16"
    >
      {order.map((stage, index) => {
        if (stage === 'agent_step') {
          const all = events.filter((e) => e.stage === 'agent_step' || e.parent);
          const settled = byStage.has('select_context') || stopped;
          const status: StepStatus =
            searches.length === 0
              ? !stopped && stage === firstMissing
                ? 'running'
                : 'pending'
              : settled
                ? groupStatus(searches.map((s) => s.step))
                : 'running';
          const found = searches
            .map((s) => (s.step.data as AgentStepData).found)
            .find((n) => n !== undefined);
          const searchCount = searches.filter(
            (s) => (s.step.data as AgentStepData).tool === 'search',
          ).length;
          return (
            <StepSheet
              key={stage}
              number={index + 1}
              copy={STAGES[stage]}
              status={status}
              summary={searches.length ? COPY.summary.searched(searchCount, found ?? 0) : undefined}
              snippets={snippetsFor(stage)}
              measure={searches.length ? total(all) : undefined}
            >
              {searches.length > 0 && (
                <AgentStepsView
                  searches={searches}
                  caps={(plan?.data as AgentPlanData | undefined)?.caps}
                  agentTokens={
                    (plan?.tokens ?? 0) + searches.reduce((t, s) => t + s.step.tokens, 0)
                  }
                />
              )}
            </StepSheet>
          );
        }
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
