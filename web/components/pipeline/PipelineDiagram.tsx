import { ChevronRight, Equal } from 'lucide-react';

import { AlgebraKey } from '@/components/formal/AlgebraKey';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { STAGES } from '@/content/stages';
import type { Stage } from '@/lib/generated/trace';
import { pad2 } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { StepStatus } from './StatusMark';

const D = COPY.diagram;
// BM25 and vector search run side by side, so the diagram draws them as one stacked pair.
const PARALLEL: Stage[] = ['bm25', 'vector'];

type Cell = { stages: Stage[] };

const cells = (order: Stage[]): Cell[] =>
  order.reduce<Cell[]>((out, stage) => {
    const last = out.at(-1);
    if (last && PARALLEL.includes(stage) && PARALLEL.includes(last.stages[0])) {
      last.stages.push(stage);
    } else {
      out.push({ stages: [stage] });
    }
    return out;
  }, []);

type NodeProps = {
  stage: Stage;
  number: number;
  status: StepStatus;
};

// One step as a box on the diagram, linked to its sheet below. Waiting steps are dashed, the
// running one is drawn in blue pencil, finished ones in graphite: the same marks as the list.
const Node = ({ stage, number, status }: NodeProps) => {
  return (
    <a
      href={`#step-${stage}`}
      data-status={status}
      className={cn(
        'flex items-baseline gap-1.5 rounded-sm border px-2 py-1 text-xs leading-snug hover:bg-accent',
        status === 'pending' || status === 'skipped'
          ? 'border-dashed text-muted-foreground'
          : 'bg-card text-foreground',
        status === 'running' && 'border-primary text-primary',
        status === 'error' && 'border-destructive',
      )}
    >
      <span className="voice-data text-muted-foreground">{pad2(number)}</span>
      {STAGES[stage].title}
    </a>
  );
};

const Arrow = () => (
  <ChevronRight aria-hidden className="size-3.5 shrink-0 self-center text-muted-foreground" />
);

type PipelineDiagramProps = {
  order: Stage[];
  statusOf: (stage: Stage) => StepStatus;
};

// The whole system on one figure: what was built ahead of time, then every step a question
// goes through, in the order of the steps below. It follows the current run as it streams.
const PipelineDiagram = ({ order, statusOf }: PipelineDiagramProps) => {
  const number = (stage: Stage) => order.indexOf(stage) + 1;
  return (
    <figure aria-labelledby="diagram-title" className="space-y-3 border-y border-dashed py-4">
      <Typography variant="label" as="figcaption" id="diagram-title">
        {D.title}
      </Typography>

      <div className="grid gap-x-4 gap-y-1 md:grid-cols-[9rem_minmax(0,1fr)]">
        <Typography variant="label" color="muted" as="p" className="pt-1.5">
          {D.offline}
        </Typography>
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
          {D.offlineSteps.map((text, i) => (
            <li key={text} className="flex items-center gap-1">
              {i > 0 && <Arrow />}
              <span className="rounded-sm border border-dashed px-2 py-1 text-xs leading-snug text-muted-foreground">
                {text}
              </span>
            </li>
          ))}
        </ol>

        <Typography variant="label" color="muted" as="p" className="pt-3 md:pt-1.5">
          {D.online}
        </Typography>
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
          {cells(order).map(({ stages }, i) => (
            <li key={stages.join('+')} className="flex items-center gap-1">
              {i > 0 && <Arrow />}
              <span className="flex flex-col gap-1">
                {stages.map((stage) => (
                  <Node key={stage} stage={stage} number={number(stage)} status={statusOf(stage)} />
                ))}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <Arrow />
            <span className="inline-flex items-center gap-1 rounded-sm border border-foreground/70 px-2 py-1 text-xs font-semibold">
              <Equal aria-hidden className="size-3 text-primary" />
              {D.answer}
            </span>
          </li>
        </ol>
      </div>

      <Typography variant="small" color="muted" className="max-w-[68ch]">
        {order.includes('agent_step') ? D.agentOn : D.agentOff}
      </Typography>
      <AlgebraKey agentic={order.includes('agent_step')} />
    </figure>
  );
};

export { PipelineDiagram };
