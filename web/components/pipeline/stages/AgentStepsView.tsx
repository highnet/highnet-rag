'use client';

import { ChevronDown } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { STAGES } from '@/content/stages';
import { type AgentSearch, type AgentStepData, searchResults } from '@/lib/agent';
import { stepSummary } from '@/lib/step-summary';

import { Bar } from '../figures/Bar';
import { Figure } from '../figures/Figure';
import { Readout } from '../Readout';
import { StatusMark, type StepStatus } from '../StatusMark';
import { RankBadge } from './RankBadge';

type AgentStepsViewProps = {
  searches: AgentSearch[];
  caps?: { max_steps: number; token_cap: number };
  agentTokens: number;
};

const A = COPY.figures.agent;

const sum = (events: AgentSearch['stages'], key: 'ms' | 'tokens' | 'cost_usd') =>
  events.reduce((total, e) => total + e[key], 0);

// One sub-sheet per tool call, numbered 3a, 3b, …: the query, Claude's note, what came back,
// and every stage the search ran, folded.
const AgentStepsView = ({ searches, caps, agentTokens }: AgentStepsViewProps) => {
  const used = searches.filter((s) => (s.step.data as AgentStepData).tool === 'search').length;
  return (
    <div className="space-y-4">
      {caps && (
        <Figure
          caption={A.meterCaption}
          alt={`${A.searches}: ${used} of ${caps.max_steps}. ${A.tokens}: ${agentTokens} of ${caps.token_cap}.`}
        >
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 text-sm">
            <span className="text-muted-foreground">{A.searches}</span>
            <Bar
              max={caps.max_steps}
              marks={[caps.max_steps]}
              segments={[{ key: 's', value: used }]}
            />
            <span className="voice-data text-right">
              {used}/{caps.max_steps}
            </span>
            <span className="text-muted-foreground">{A.tokens}</span>
            <Bar max={caps.token_cap} segments={[{ key: 't', value: agentTokens }]} />
            <span className="voice-data text-right">
              {agentTokens.toLocaleString('en')}/{caps.token_cap.toLocaleString('en')}
            </span>
          </div>
        </Figure>
      )}
      <ol className="space-y-3">
        {searches.map(({ step, stages }) => {
          const data = step.data as AgentStepData;
          const results = searchResults(stages);
          return (
            <li key={step.seq} className="border-t border-dashed pt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="flex min-w-0 items-baseline gap-2 text-sm">
                  <span className="voice-data text-primary">{step.label}</span>
                  <span className="voice-data text-muted-foreground">{data.tool}</span>
                  {data.input.query && (
                    <span className="voice-data min-w-0 rounded-sm border border-dashed px-2 py-0.5 break-words">
                      {data.input.query}
                    </span>
                  )}
                </p>
                <span className="flex items-center gap-3">
                  <Readout
                    ms={step.ms + sum(stages, 'ms')}
                    tokens={step.tokens + sum(stages, 'tokens')}
                    costUsd={step.cost_usd + sum(stages, 'cost_usd')}
                  />
                  <StatusMark status={step.status as StepStatus} />
                </span>
              </div>
              {data.note && data.tool !== 'answer' && (
                <Typography variant="marginNote" className="mt-1 text-sm">
                  {data.note}
                </Typography>
              )}
              {data.tool === 'answer' && (
                <Typography variant="small" className="mt-1">
                  {A.answered(data.found ?? 0)}
                </Typography>
              )}
              {data.tool === 'none' && (
                <Typography variant="small" color="muted" className="mt-1">
                  {A.noTool}
                </Typography>
              )}
              {data.stopped && (
                <Typography variant="small" color="warning" className="mt-1">
                  {A.stopped}: {data.stopped}
                </Typography>
              )}
              {data.error && (
                <Typography variant="small" color="warning" className="mt-1">
                  {data.error.message}
                </Typography>
              )}
              {results.length > 0 && (
                <ol className="mt-2 space-y-0.5 text-sm">
                  {results.map((r) => (
                    <li key={r.chunk_id} className="flex items-baseline gap-2">
                      <RankBadge series="fused" rank={r.rank} marker={false} className="w-6" />
                      {r.doc_title}
                      <span className="voice-data text-xs text-muted-foreground">
                        #{r.chunk_id}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {stages.length > 0 && (
                <Collapsible className="mt-2">
                  <CollapsibleTrigger className="group voice-pencil flex min-h-8 cursor-pointer items-center gap-1 text-sm text-primary">
                    <ChevronDown
                      aria-hidden
                      className="size-4 transition-transform group-data-[state=open]:rotate-180"
                    />
                    <span className="underline decoration-dotted underline-offset-4 group-data-[state=open]:hidden">
                      {A.showStages(step.label, stages.length)}
                    </span>
                    <span className="hidden underline decoration-dotted underline-offset-4 group-data-[state=open]:inline">
                      {A.hideStages(step.label)}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ol className="mt-1 space-y-1">
                      {stages.map((e) => (
                        <li
                          key={e.seq}
                          className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 text-sm"
                        >
                          <span className="voice-data text-muted-foreground">{e.label}</span>
                          <span>
                            {STAGES[e.stage].title}
                            <span className="voice-data block text-xs text-muted-foreground sm:ml-3 sm:inline">
                              {stepSummary(e)}
                            </span>
                          </span>
                          <StatusMark status={e.status as StepStatus} />
                        </li>
                      ))}
                    </ol>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export { AgentStepsView };
