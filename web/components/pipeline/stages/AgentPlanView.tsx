'use client';

import { ChevronDown } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';

import { Facts } from './Facts';

export type AgentPlanData = {
  provider: string;
  model: string;
  plan: string;
  queries: string[];
  caps: { max_steps: number; token_cap: number };
  system: string;
};

type AgentPlanViewProps = { data: AgentPlanData };

const A = COPY.figures.agent;

// The agent's first turn: what it means to do, the searches it wrote, and the rules it runs under.
const AgentPlanView = ({ data }: AgentPlanViewProps) => {
  return (
    <div className="space-y-3">
      {data.plan && <Typography variant="marginNote">{data.plan}</Typography>}
      {data.queries.length > 0 && (
        <div className="space-y-1">
          <Typography variant="label" color="muted" as="p">
            {A.queries}
          </Typography>
          <ol className="space-y-1">
            {data.queries.map((query, i) => (
              <li key={i} className="flex items-baseline gap-3 text-sm">
                <span className="voice-data text-muted-foreground">
                  3{String.fromCharCode(97 + i)}
                </span>
                <span className="voice-data rounded-sm border border-dashed px-2 py-0.5">
                  {query}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Facts
        facts={[
          { term: 'Model', value: `${data.provider} · ${data.model}` },
          {
            term: 'Caps',
            value: A.caps(data.caps.max_steps, data.caps.token_cap.toLocaleString('en')),
          },
        ]}
      />
      <Collapsible>
        <CollapsibleTrigger className="group voice-pencil flex min-h-8 cursor-pointer items-center gap-1 text-sm text-primary">
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform group-data-[state=open]:rotate-180"
          />
          <span className="underline decoration-dotted underline-offset-4 group-data-[state=open]:hidden">
            {A.instructions}
          </span>
          <span className="hidden underline decoration-dotted underline-offset-4 group-data-[state=open]:inline">
            {A.hideInstructions}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Typography
            variant="small"
            color="muted"
            className="mt-2 max-w-[72ch] border-l border-input pl-3"
          >
            {data.system}
          </Typography>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export { AgentPlanView };
