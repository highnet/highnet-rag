/* Generated from evals/src/highnet_rag_evals/results.py by `npm run gen:types`. Do not edit. */

export type SchemaVersion = number;
export type StartedAt = string;
export type FinishedAt = string;
export type DurationS = number;
export type GitSha = string | null;
export type Illustrative = boolean;
export type CorpusBuildId = string;
export type CorpusBuiltAt = string;
export type Provider = string;
export type Model = string;
export type Name = 'squad_auto' | 'owner' | 'compound';
export type Questions = number;
export type Answerable = number;
export type Unanswerable = number;
export type Golden = GoldenSetInfo[];
export type Depth = number;
export type Ks = number[];
export type Questions1 = number;
export type Mode = string;
export type ChunkSet = string;
export type Rerank = boolean;
export type Questions2 = number;
export type Errors = number;
export type Mrr = number;
export type MeanMs = number;
export type CostUsd = number;
export type Configs = RetrievalConfig[];
export type Mode1 = string;
export type ChunkSet1 = string;
export type K = number;
export type Rerank1 = boolean;
export type Questions3 = number;
export type Errors1 = number;
export type Count = number;
export type Of = number;
export type Value = number | null;
export type Faithfulness = number | null;
export type Questions4 = number;
export type Errors2 = number;
export type Faithfulness1 = number | null;
export type MeanMs1 = number;
export type MeanCostUsd = number;
export type Compound = CompoundResults[] | null;
export type Pipeline = 'classic' | 'agentic';
export type Questions5 = number;
export type Errors3 = number;
export type ArticleCoverage = number;
export type Faithfulness2 = number | null;
export type MeanSearches = number;
export type MeanTokens = number;
export type MeanMs2 = number;
export type MeanCostUsd1 = number;
export type TotalUsd = number;
export type Provider1 = string;
export type Model1 = string;
export type Calls = number;
export type InputTokens = number;
export type OutputTokens = number;
export type CostUsd1 = number;
export type ByModel = CostLine[];

export interface HighnetRagEvalResults {
  schema_version?: SchemaVersion;
  run: RunInfo;
  golden: Golden;
  retrieval: RetrievalResults;
  answers: AnswerResults | null;
  compound: Compound;
  cost: CostResults;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "RunInfo".
 */
export interface RunInfo {
  started_at: StartedAt;
  finished_at: FinishedAt;
  duration_s: DurationS;
  git_sha: GitSha;
  illustrative: Illustrative;
  corpus_build_id: CorpusBuildId;
  corpus_built_at: CorpusBuiltAt;
  embed: ModelRef;
  rerank: ModelRef;
  answer: ModelRef;
  judge: ModelRef;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "ModelRef".
 */
export interface ModelRef {
  provider: Provider;
  model: Model;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "GoldenSetInfo".
 */
export interface GoldenSetInfo {
  name: Name;
  questions: Questions;
  answerable: Answerable;
  unanswerable: Unanswerable;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "RetrievalResults".
 */
export interface RetrievalResults {
  depth: Depth;
  ks: Ks;
  questions: Questions1;
  unmatched: Unmatched;
  configs: Configs;
}
export interface Unmatched {
  [k: string]: number;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "RetrievalConfig".
 */
export interface RetrievalConfig {
  mode: Mode;
  chunk_set: ChunkSet;
  rerank: Rerank;
  questions: Questions2;
  errors: Errors;
  recall: Recall;
  mrr: Mrr;
  mean_ms: MeanMs;
  cost_usd: CostUsd;
}
export interface Recall {
  [k: string]: number;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "AnswerResults".
 */
export interface AnswerResults {
  config: AnswerConfig;
  answerable: AnswerableResults;
  unanswerable: UnanswerableResults;
  mean_ms: MeanMs1;
  mean_cost_usd: MeanCostUsd;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "AnswerConfig".
 */
export interface AnswerConfig {
  mode: Mode1;
  chunk_set: ChunkSet1;
  k: K;
  rerank: Rerank1;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "AnswerableResults".
 */
export interface AnswerableResults {
  questions: Questions3;
  errors: Errors1;
  abstained: Rate;
  correct: Rate;
  evidence_in_context: Rate;
  correct_with_evidence: Rate;
  faithfulness: Faithfulness;
  fully_supported: Rate;
}
/**
 * A share with its counts, so the page can say "41 of 50" as well as "82%".
 *
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "Rate".
 */
export interface Rate {
  count: Count;
  of: Of;
  value: Value;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "UnanswerableResults".
 */
export interface UnanswerableResults {
  questions: Questions4;
  errors: Errors2;
  abstained: Rate;
  faithfulness: Faithfulness1;
  fully_supported: Rate;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "CompoundResults".
 */
export interface CompoundResults {
  pipeline: Pipeline;
  questions: Questions5;
  errors: Errors3;
  all_articles_found: Rate;
  article_coverage: ArticleCoverage;
  correct: Rate;
  abstained: Rate;
  faithfulness: Faithfulness2;
  mean_searches: MeanSearches;
  mean_tokens: MeanTokens;
  mean_ms: MeanMs2;
  mean_cost_usd: MeanCostUsd1;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "CostResults".
 */
export interface CostResults {
  total_usd: TotalUsd;
  by_model: ByModel;
}
/**
 * This interface was referenced by `HighnetRagEvalResults`'s JSON-Schema
 * via the `definition` "CostLine".
 */
export interface CostLine {
  provider: Provider1;
  model: Model1;
  calls: Calls;
  input_tokens: InputTokens;
  output_tokens: OutputTokens;
  cost_usd: CostUsd1;
}
