/* Generated from api/src/highnet_rag/trace.py by `npm run gen:types`. Do not edit. */

export type RunId = string;
export type Text = string;
export type RunId1 = string;
export type Status = 'ok' | 'error' | 'limited';
export type Ms = number;
export type Tokens = number;
export type CostUsd = number;
export type Stages = number;
export type RunId2 = string;
/**
 * Emission order within the run, starting at 1.
 */
export type Seq = number;
export type Stage =
  | 'request'
  | 'embed_query'
  | 'map_project'
  | 'bm25'
  | 'vector'
  | 'fuse'
  | 'rerank'
  | 'select_context'
  | 'prompt'
  | 'generate'
  | 'citations'
  | 'agent_plan'
  | 'agent_step';
export type Status1 = 'ok' | 'skipped' | 'error' | 'warning';
/**
 * Parent agent_step id (agentic mode).
 */
export type Parent = string | null;
/**
 * Step number shown on the pad, e.g. '5' or '4b'.
 */
export type Label = string;
/**
 * Wall time of this stage in milliseconds.
 */
export type Ms1 = number;
/**
 * Tokens billed by this stage.
 */
export type Tokens1 = number;
/**
 * Cost of this stage in USD.
 */
export type CostUsd1 = number;

export interface HighnetRagTraceEvents {
  [k: string]: unknown;
}
/**
 * SSE `event: answer_delta` - streamed answer text while `generate` runs.
 *
 * This interface was referenced by `HighnetRagTraceEvents`'s JSON-Schema
 * via the `definition` "AnswerDelta".
 */
export interface AnswerDelta {
  run_id: RunId;
  text: Text;
}
/**
 * SSE `event: done` - always the last event of a run.
 *
 * This interface was referenced by `HighnetRagTraceEvents`'s JSON-Schema
 * via the `definition` "RunDone".
 */
export interface RunDone {
  run_id: RunId1;
  status: Status;
  ms: Ms;
  tokens: Tokens;
  cost_usd: CostUsd;
  stages: Stages;
}
/**
 * SSE `event: trace`.
 *
 * This interface was referenced by `HighnetRagTraceEvents`'s JSON-Schema
 * via the `definition` "TraceEvent".
 */
export interface TraceEvent {
  run_id: RunId2;
  seq: Seq;
  stage: Stage;
  status: Status1;
  parent: Parent;
  label: Label;
  data: Data;
  ms: Ms1;
  tokens: Tokens1;
  cost_usd: CostUsd1;
}
export interface Data {
  [k: string]: unknown;
}
