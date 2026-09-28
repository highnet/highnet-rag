import { agentSearches, topLevel } from '@/lib/agent';
import type { Stage, TraceEvent } from '@/lib/generated/trace';
import type { RunStatus } from '@/lib/use-trace-stream';

import type { StepStatus } from '@/components/pipeline/StatusMark';

// The worst state among an agent's steps; a stop at a cap reads as a warning.
const groupStatus = (events: TraceEvent[]): StepStatus =>
  events.some((e) => e.status === 'error')
    ? 'error'
    : events.some((e) => e.status === 'warning')
      ? 'warning'
      : 'ok';

// Each step's state from the trace so far: its event's status, "running" for the first step
// still missing while the run streams, "pending" otherwise. Shared by the step list and the
// pipeline diagram so the two always agree.
export const stepStatuses = (order: Stage[], events: TraceEvent[], runStatus: RunStatus) => {
  const byStage = new Map(topLevel(events).map((e) => [e.stage, e]));
  const searches = agentSearches(events);
  const has = (stage: Stage) => (stage === 'agent_step' ? searches.length > 0 : byStage.has(stage));
  const firstMissing = order.find((stage) => !has(stage));
  const stopped = runStatus !== 'running';
  return (stage: Stage): StepStatus => {
    if (stage === 'agent_step' && searches.length > 0) {
      const settled = byStage.has('select_context') || stopped;
      return settled ? groupStatus(searches.map((s) => s.step)) : 'running';
    }
    const event = byStage.get(stage);
    if (event) return event.status as StepStatus;
    return !stopped && stage === firstMissing ? 'running' : 'pending';
  };
};
