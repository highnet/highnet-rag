import type { Stage } from '@/lib/generated/trace';

// English copy for each pipeline step. Voice: a precise lab partner. Plain, exact,
// first-person plural, no hype; name trade-offs and say when a step is weak.
export type StageCopy = {
  title: string;
  why: string;
  detail: string;
};

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
    why: 'Every run costs real money, so before calling any API we check your rate limit and what is left of this month’s budget.',
    detail:
      'Limits are counted per hashed IP address. At 80% of the monthly cap the expensive features switch off; at 100% live queries stop until the next month.',
  },
  embed_query: {
    title: 'Embed the question',
    why: 'We turn the question into a vector: a long list of numbers that places its meaning in space. Passages with similar meaning sit nearby, and that is how we will find them.',
    detail:
      'The question is embedded as a “query”; every passage was embedded as a “document” when the corpus was built. Only the first 8 dimensions are shown. The vectors are normalised to length 1, so direction is all that matters.',
  },
  map_project: {
    title: 'Place it on the map',
    why: 'That space has hundreds of dimensions. To make it visible we flatten it to two with PCA, fitted once on the whole corpus, and drop the question in.',
    detail:
      'The percentages say how much of the original spread the two axes keep. When they are low, the 2D picture is a rough sketch: neighbours on the map are not always the passages the search finds.',
  },
  bm25: {
    title: 'Keyword search (BM25)',
    why: 'BM25 ranks passages by the question’s exact words, weighting rare words more than common ones. It finds names and numbers that vector search can blur.',
    detail:
      'SQLite FTS5 with the Porter stemmer, filtered to the selected chunk size. We drop stop words and quote each remaining term, so your text is never read as query syntax. Scores are shown higher-is-better.',
  },
  vector: {
    title: 'Vector search',
    why: 'We compare the question’s vector with every passage vector and keep the closest ones. This finds passages that mean the same thing even when they use different words.',
    detail:
      'Cosine distance: 0 means the same direction, 1 means unrelated. sqlite-vec compares against every chunk of the selected size exactly; there is no approximate index.',
  },
  fuse: {
    title: 'Fuse the rankings',
    why: 'Hybrid search merges the keyword and vector rankings, so each covers the other’s blind spots. A passage both searches liked rises to the top.',
    detail:
      'Reciprocal rank fusion: each list contributes 1 / (60 + rank) to a passage’s score. Only ranks count, so BM25 scores and cosine distances never need to be put on one scale. Each search fetches twice top-k so fusion has candidates to promote.',
  },
  rerank: {
    title: 'Rerank',
    why: 'A reranker reads the question and each candidate together and scores them again: slower than vector distance, but usually more accurate.',
    detail: 'Voyage rerank-2.5-lite, applied to the candidates from the search steps.',
  },
  select_context: {
    title: 'Choose the context',
    why: 'The top passages become the only facts the model may use. If the answer is not in here, the model cannot find it. This is where most RAG answers are won or lost.',
    detail:
      'Token counts here are estimates (words × 4/3). The exact count, as the model sees it, follows in the next step.',
  },
  prompt: {
    title: 'Write the prompt',
    why: 'We hand the model its instructions, the passages as citable documents, and the question. This is the exact request, nothing hidden.',
    detail:
      'The token count comes from the provider’s token-counting endpoint. The worst-case cost assumes the answer uses every allowed output token; if that could exceed the remaining budget, we refuse the call.',
  },
  generate: {
    title: 'Generate the answer',
    why: 'The model writes an answer from the passages alone and cites them as it goes. The text streams in as it is written.',
    detail:
      'Cost uses the input and output token counts the API reports for this call, not an estimate.',
  },
  citations: {
    title: 'Check the citations',
    why: 'We map every citation back to the passage it came from, so you can check the answer against its evidence.',
    detail:
      'Passages that were retrieved but never cited are listed too: they cost tokens without helping the answer.',
  },
  agent_plan: {
    title: 'Plan the search',
    why: 'The agent rewrites the question into the searches it needs.',
    detail: 'Arrives in milestone 5.',
  },
  agent_step: {
    title: 'Agent step',
    why: 'One search the agent chose to run.',
    detail: 'Arrives in milestone 5.',
  },
};
