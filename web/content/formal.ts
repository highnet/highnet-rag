import type { Stage } from '@/lib/generated/trace';

// The pipeline as relational algebra over three base relations, for readers who know it:
// standard operators go unexplained; KEY covers the relations, the extended operators and the
// domain functions, each explained on tap. Plain language stays in the step paragraphs.

export type KeyEntry = {
  name: string;
  meaning: string;
  group: 'table' | 'operator' | 'function' | 'value';
};

export const KEY: Record<string, KeyEntry> = {
  D: { group: 'table', name: 'Articles', meaning: 'D(doc, title, text): the 35 articles' },
  C: { group: 'table', name: 'Chunks', meaning: 'C(chunk, doc, size, start, end, text)' },
  E: {
    group: 'table',
    name: 'Embeddings',
    meaning: 'E(chunk, v): one unit vector per chunk, built ahead of time',
  },
  B: { group: 'table', name: 'BM25 results', meaning: 'B(chunk, rank, score)' },
  V: { group: 'table', name: 'Vector results', meaning: 'V(chunk, rank, cos)' },
  F: { group: 'table', name: 'Fused results', meaning: 'F(chunk, rrf)' },
  R: {
    group: 'table',
    name: 'Final ranking',
    meaning: 'R(chunk, relevance), or F when the reranker is off',
  },
  K: {
    group: 'table',
    name: 'Context',
    meaning: 'the top k passages: the only facts the model is given',
  },
  τ: {
    group: 'operator',
    name: 'sort',
    meaning: 'sorts on the subscripted attribute, ↓ descending, ↑ ascending',
  },
  λ: { group: 'operator', name: 'limit', meaning: 'keeps the first n rows, n subscripted' },
  γ: {
    group: 'operator',
    name: 'group by',
    meaning: 'groups on the attribute before the colon and aggregates into the one after',
  },
  score: {
    group: 'function',
    name: 'BM25 score',
    meaning: 'term frequency × IDF, length-normalised (SQLite FTS5)',
  },
  cos: {
    group: 'function',
    name: 'cosine similarity',
    meaning: '⟨v, vq⟩ for unit vectors; the trace shows 1 − cos as distance',
  },
  rrf: {
    group: 'function',
    name: 'reciprocal rank fusion',
    meaning: 'Σ over the input lists of 1 / (60 + rank)',
  },
  relevance: {
    group: 'function',
    name: 'reranker score',
    meaning: 'a cross-encoder reads (q, text) together (Voyage rerank-2.5-lite)',
  },
  q: { group: 'value', name: 'question', meaning: 'the question text' },
  vq: { group: 'value', name: 'question vector', meaning: 'embed(q), a unit vector' },
  s: { group: 'value', name: 'chunk size', meaning: 'small, medium or large' },
  k: { group: 'value', name: 'top-k', meaning: 'passages sent to the model' },
  n: {
    group: 'value',
    name: 'depth',
    meaning: 'rows kept per search: k, or 2k when fusing or reranking',
  },
  terms: { group: 'value', name: 'search terms', meaning: 'q’s tokens minus stop words' },
  a: { group: 'value', name: 'answer', meaning: 'sentences with their cited chunks' },
};

export const FORMAL = {
  title: 'The same pipeline, as formulas',
  intro:
    'Each step maps relations to relations. Standard operators (σ, π, ⋈, ∪, ∖, ∘) are used as usual; the key covers the rest.',
  groups: {
    table: 'Relations',
    operator: 'Extended operators',
    function: 'Functions',
    value: 'Values',
  },
  whole: 'The whole run, read right to left:',
  wholeClassic:
    'a = cite ∘ generate ∘ prompt ∘ context ∘ rerank ∘ fuse ∘ (bm25, vector) ∘ embed ∘ check (q)',
  wholeAgent: 'a = cite ∘ generate ∘ prompt ∘ context ∘ (∪ search) ∘ plan ∘ check (q)',
  label: 'As a formula',
  hint: 'Tap an underlined symbol for its definition.',
};

// One formula per step. `_{…}` is a subscript and `^{…}` a superscript; words not in KEY are
// plain text.
export const STEP_FORMULAS: Record<Stage, string> = {
  request: 'q ↦ q  if  runs_{minute} < limit ∧ spent < cap,  otherwise ⊥',
  embed_query: 'vq = embed(q)',
  map_project: '(x, y) = (vq − μ_{E}) P_{E}^{T},  P_{E}: first two principal components of E',
  bm25: 'B = λ_{n} τ_{score↓} σ_{size = s ∧ text ∋ terms} (C)',
  vector: 'V = λ_{n} τ_{cos↓} (σ_{size = s} (C) ⋈ E)',
  fuse: 'F = τ_{rrf↓} γ_{chunk: rrf = Σ 1 / (60 + rank)} (B ∪ V)',
  rerank: 'R = τ_{relevance↓} (F ⋈ C)   (off: R = F)',
  select_context: 'K = λ_{k} R ⋈ C ⋈ D',
  prompt: 'prompt = instructions + K + q',
  generate: 'a = Claude(prompt)',
  citations: 'unused = K ∖ cited(a)',
  agent_plan: 'q_{1}, …, q_{m} = Claude(q)',
  agent_step: 'K = ∪ λ_{k} search(q_{i})',
};
