import type { TraceEvent } from '@/lib/generated/trace';

// Agentic runs interleave each search step with its own nested retrieval stages; these helpers
// regroup them for the "Search, step by step" sheet.
export type AgentSearch = { step: TraceEvent; stages: TraceEvent[] };

export type AgentStepData = {
  tool: string;
  input: { query?: string };
  note?: string;
  found?: number;
  stopped?: string;
  error?: { message: string };
};

export const topLevel = (events: TraceEvent[]) => events.filter((e) => !e.parent);

export const agentSearches = (events: TraceEvent[]): AgentSearch[] =>
  events
    .filter((e) => e.stage === 'agent_step' && !e.parent)
    .map((step) => ({ step, stages: events.filter((e) => e.parent === step.label) }));

// What a finished search handed back to the model: the top of its last ranking, cut at the
// stage's top-k when it records one (fusion and reranking rank more candidates than they keep).
export const searchResults = (stages: TraceEvent[]) => {
  const ranked = [...stages]
    .reverse()
    .find((e) => e.status !== 'skipped' && e.status !== 'error' && Array.isArray(e.data.results));
  const results = (ranked?.data.results ?? []) as {
    chunk_id: number;
    rank: number;
    doc_title: string;
  }[];
  const kept = ranked?.data.kept;
  return typeof kept === 'number' ? results.slice(0, kept) : results;
};
