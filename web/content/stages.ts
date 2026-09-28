import type { Stage } from '@/lib/generated/trace';

// English copy for each pipeline step. Voice: a precise lab partner. Plain, exact,
// first-person plural, no hype; name trade-offs and say when a step is weak.
export type StageCopy = {
  title: string;
  why: string;
  detail: string;
};

// Agentic mode replaces the single retrieval pass with a plan and a loop of searches.
export const AGENT_STAGE_ORDER: Stage[] = [
  'request',
  'agent_plan',
  'agent_step',
  'select_context',
  'prompt',
  'generate',
  'citations',
];

export const STAGE_ORDER: Stage[] = [
  'request',
  'embed_query',
  'map_project',
  'bm25',
  'vector',
  'fuse',
  'rerank',
  'select_context',
  'prompt',
  'generate',
  'citations',
];

export const STAGES: Record<Stage, StageCopy> = {
  request: {
    title: 'Check the request',
    why: 'Every run calls paid APIs, so before anything else we check two limits: how many questions you have asked recently, and how much of this month’s budget is left. If either is used up we stop here and say why, rather than failing halfway through. Nothing has been searched or sent to a model yet. The bars show how close you are to each limit.',
    detail:
      'Limits are counted per hashed IP address. At 80% of the monthly cap the expensive features switch off; at 100% live queries stop until the next month.',
  },
  embed_query: {
    title: 'Embed the question',
    why: 'To search by meaning, we first turn your question into an embedding: a long list of numbers that places what it means at a point in space. Every passage in the corpus was turned into a point the same way when the corpus was built, so questions and passages about the same thing land close together. The numbers mean nothing one by one; only their overall direction matters. The bars below show the first few of them.',
    detail:
      'The question is embedded as a “query”; every passage was embedded as a “document” when the corpus was built. Only the first 8 dimensions are shown. The vectors are normalised to length 1, so direction is all that matters.',
  },
  map_project: {
    title: 'Place it on the map',
    why: 'Nobody can picture a space with that many dimensions, so we flatten the space to two with PCA, a projection fitted once on every passage in the corpus, and drop your question onto it. Dots that cluster are passages on similar topics, usually from the same article. The flattening throws most of the information away, so treat the map as a sketch of where your question landed, not as the search itself. The search in the next steps uses every dimension.',
    detail:
      'The percentages say how much of the original spread the two axes keep. When they are low, the 2D picture is a rough sketch: neighbours on the map are not always the passages the search finds.',
  },
  bm25: {
    title: 'Keyword search (BM25)',
    why: 'BM25 is classic keyword search: it scores each passage by how many of your question’s words it contains, and counts rare words far more than common ones. It is exact and fast, so names, dates and numbers match reliably. Its blind spot is meaning: “car” never finds “automobile”. Below, see which of your words became search terms and how much each one weighed.',
    detail:
      'SQLite FTS5 with the Porter stemmer, filtered to the selected chunk size. We drop stop words and quote each remaining term, so your text is never read as query syntax. Scores are shown higher-is-better.',
  },
  vector: {
    title: 'Vector search',
    why: 'Vector search compares your question’s embedding with every passage embedding and keeps the closest ones. It finds passages that say the same thing in different words, which keyword search misses. In exchange it can drift towards passages that are merely on the same topic, and it blurs exact names and numbers. The distances below show how close the best matches really are.',
    detail:
      'Cosine distance: 0 means the same direction, 1 means unrelated. sqlite-vec compares against every chunk of the selected size exactly; there is no approximate index.',
  },
  fuse: {
    title: 'Fuse the rankings',
    why: 'Hybrid search runs both searches and merges their rankings, so each covers the other’s blind spots. We merge by rank, not by score: a passage near the top of both lists beats one that only a single search liked. That way BM25 scores and vector distances never have to be put on the same scale. Follow a passage’s rank in each input list to see why it ended up where it did.',
    detail:
      'Reciprocal rank fusion: each list contributes 1 / (60 + rank) to a passage’s score. Only ranks count, so BM25 scores and cosine distances never need to be put on one scale. Each search fetches twice top-k so fusion has candidates to promote.',
  },
  rerank: {
    title: 'Rerank',
    why: 'The searches so far score the question and each passage separately. A reranker reads the question and a passage together, which is slower but usually judges relevance better. We give it the top candidates and let it reorder them. Watch which passages move up or down, and whether the top of the list changes at all. It is off by default because it adds time and cost to every question.',
    detail: 'Voyage rerank-2.5-lite, applied to the candidates from the search steps.',
  },
  select_context: {
    title: 'Choose the context',
    why: 'Only the top passages go to the model. They are the only facts it is allowed to use, so if the answer is not among them the model cannot find it. This is where most RAG answers are won or lost: a wrong answer usually means a wrong passage here, not a weak model. The figure shows how much of the context each passage takes up.',
    detail:
      'Token counts here are estimates (words × 4/3). The exact count, as the model sees it, follows in the next step.',
  },
  prompt: {
    title: 'Write the prompt',
    why: 'We now write the exact request the model receives: our instructions, the passages as numbered documents it can cite, and your question. Nothing else is sent, and the whole thing is shown below. Before sending, we count its tokens and work out the most the answer could cost. If that could go over the budget, we refuse to send it.',
    detail:
      'The token count comes from the provider’s token-counting endpoint. The worst-case cost assumes the answer uses every allowed output token; if that could exceed the remaining budget, we refuse the call.',
  },
  generate: {
    title: 'Generate the answer',
    why: 'The model writes its answer from the passages alone, citing them as it goes, and the text streams in as it is written. It has been told to say so when the passages don’t contain the answer, rather than guess from memory. The cost comes from the token counts the API reports for this call. Most of it is usually input: the passages we just sent.',
    detail:
      'Cost uses the input and output token counts the API reports for this call, not an estimate.',
  },
  citations: {
    title: 'Check the citations',
    why: 'We map every citation back to the passage it came from, so you can check each claim against its evidence. A sentence without a citation is the model’s own glue or conclusion, and deserves a closer look. Passages that were sent but never cited are listed too: they cost tokens without helping this answer. If nothing was cited and the model didn’t decline to answer, we flag it.',
    detail:
      'Passages that were retrieved but never cited are listed too: they cost tokens without helping the answer.',
  },
  agent_plan: {
    title: 'Plan the searches',
    why: 'Some questions join two facts from different articles, and one search rarely finds both. In agentic mode Claude reads the question first, says how it will split it, and writes a short search for each part. It works through two tools: search, which runs the full retrieval pipeline with your settings, and answer, which says the passages are enough. Its instructions and the limits on searches and tokens are shown below.',
    detail:
      'The agent works through tool calls: search runs the whole retrieval pipeline with your settings, answer says the passages are enough. Its instructions and the caps on searches and tokens are shown here.',
  },
  agent_step: {
    title: 'Search, step by step',
    why: 'Each search is a complete retrieval run of its own, numbered 3a, 3b and so on, with its own stages, tokens and cost. After each round Claude reads what came back and decides whether to search again or answer. The loop has hard limits on searches and tokens, and if it hits one it stops and says which. Open a search to see what it found.',
    detail:
      'Every search is numbered (3a, 3b, …) and keeps its own stages, tokens and cost. The loop stops when Claude calls answer, or at the first cap it would cross, and says which.',
  },
};
