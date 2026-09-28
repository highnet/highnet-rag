// English UI copy. One catalogue so other languages can be added later.

export const COPY = {
  siteName: 'highnet-rag',
  tagline: 'Retrieval-augmented generation, worked out step by step.',
  sheetLabel: 'Sheet 1',
  emptyTitle: 'Ask the corpus a question',
  intro:
    'Ask about any of the 35 Wikipedia articles in the corpus. Every step between your question and the answer is written out below as it runs, with its timing, tokens and cost.',
  questionLabel: 'Your question',
  questionPlaceholder: 'Ask about the corpus…',
  run: 'Run',
  running: 'Running…',
  stop: 'Stop',
  tryLabel: 'Or try one of these:',
  suggestions: [
    'In what country is Normandy located?',
    'What does the name Fresno mean in Spanish?',
    'Who started the Yuan dynasty?',
    'Who won the 2018 FIFA World Cup?',
  ],
  suggestionNote: '(not in the corpus)',
  settings: {
    topK: 'Passages (top-k)',
    fewer: 'Fewer passages',
    more: 'More passages',
    search: 'Search',
    chunks: 'Chunk size',
    summary: 'Settings',
    modes: {
      bm25: { label: 'BM25', description: 'Keyword search only; no embedding call.' },
      vector: { label: 'vector', description: 'Search by meaning only.' },
      hybrid: { label: 'hybrid', description: 'Both searches, merged by reciprocal rank fusion.' },
    } as Record<string, { label: string; description: string }>,
    chunkSize: (tokens: number, chunks: number) =>
      `~${tokens} tokens each · ${chunks.toLocaleString('en')} chunks`,
    changed: 'Changed since this run. Run again to see the effect.',
  },
  workingLabel: 'The working',
  workingNote: (n: number) => `${n} steps, in the order they run`,
  // One-line step summaries on phones: the number first, then what it measures.
  summary: {
    request: (left: number, limit: number, tier: string) =>
      `${left}/${limit} per min · budget ${tier}`,
    embed: (dims: number) => `${dims} dimensions`,
    map: (x: string, y: string) => `x ${x}, y ${y}`,
    noResults: 'No passages found',
    closest: (distance: string, title: string) => `${distance} · ${title}`,
    bm25Top: (score: string, title: string) => `${score} · ${title}`,
    fused: (kept: number, both: number) => `${kept} kept · ${both} found by both searches`,
    context: (n: number, tokens: string) => `${n} passages · ~${tokens} tokens`,
    prompt: (tokens: string, worstCase: string) => `${tokens} in · ${worstCase} worst case`,
    generate: (tokens: string, stop: string) => `${tokens} out · ${stop}`,
    unknownStop: 'unknown stop',
    abstained: 'No answer in the passages',
    citations: (n: number) => (n === 1 ? '1 citation' : `${n} citations`),
  },
  // Sentences inside the step sheets, next to the tables they describe.
  stageText: {
    matchLabel: 'FTS5 query',
    columns: {
      rank: 'rank',
      passage: 'passage',
      from: 'from',
      rrf: 'rrf',
      score: 'score',
      distance: 'distance',
    },
    captions: {
      bm25: 'BM25 keyword search results',
      vector: 'Vector search results',
      bm25Input: 'BM25 ranking, input to fusion',
      vectorInput: 'Vector ranking, input to fusion',
    },
    series: { bm25: 'BM25', vector: 'vector', fused: 'fused' },
    inList: (series: string, rank: number) => `${series} rank ${rank}`,
    notInList: (series: string) => `not in the ${series} list`,
    emptyMatch: '(nothing left to search for after dropping stop words)',
    bm25: (searched: string, set: string, depth: number) =>
      `Ranked by BM25 over all ${searched} ${set} chunks; the best ${depth} are kept.`,
    vector: (searched: string, set: string, depth: number) =>
      `Compared against all ${searched} ${set} chunks by cosine distance; the closest ${depth} are kept.`,
    inputBm25: 'BM25 ranking',
    inputVector: 'Vector ranking',
    fused: (k: number) => `Fused ranking · score = Σ 1 / (${k} + rank)`,
    fusedCaption: 'Fused ranking with each passage’s rank in the BM25 and vector lists',
    cut: (k: number) => `top-k = ${k}: only the passages above this line reach the model`,
    droppedNote: 'below the top-k cut',
    showInputs: 'Show both input rankings',
    showDropped: (n: number) =>
      n === 1 ? 'Show the 1 candidate below the cut' : `Show the ${n} candidates below the cut`,
    hideDropped: 'Hide the candidates below the cut',
    contributions: (bm25: string, vector: string) => `${bm25} + ${vector}`,
    rankings: { bm25: 'BM25', vector: 'vector', fuse: 'fused' } as Record<string, string>,
    context: (n: number, ranking: string, tokens: string) =>
      `The top ${n} of the ${ranking} ranking, about ${tokens} tokens of context.`,
  },
  // Captions ("how to read this") and text alternatives for the step figures.
  figures: {
    request: {
      minute: 'This minute',
      day: 'Today',
      budget: 'Budget',
      caption: 'Filled = used. The tick on the budget bar is where expensive features switch off.',
      alt: (minute: string, day: string, spent: string, cap: string) =>
        `Rate limit: ${minute} this minute, ${day} today. Budget: ${spent} of ${cap} spent.`,
    },
    embed: {
      caption: (shown: number, dims: number) =>
        `Each bar is one of the question’s ${dims.toLocaleString('en')} coordinates; the first ${shown} are drawn. Up is positive, down is negative.`,
      alt: (values: string) => `First coordinates of the question vector: ${values}.`,
    },
    bm25: {
      stopWord: 'stop word, dropped',
      caption:
        'Words in blue pencil became search terms. A longer bar means a rarer word, which counts more when it matches.',
      inChunks: (n: number, of: string) => `in ${n.toLocaleString('en')} of ${of} chunks`,
      alt: (terms: string) => `Search terms and their weights: ${terms}.`,
    },
    distance: {
      full: 'full scale',
      zoom: 'zoomed in',
      caption:
        'Top line: where the results sit on the whole 0 to 1 scale. Bottom line: the same stretch magnified, each circle a passage by rank.',
      alt: (n: number, from: string, to: string) =>
        `${n} passages between cosine distance ${from} and ${to}.`,
    },
    context: {
      caption: 'The context, passage by passage: wider means more tokens.',
      citedNote: 'Blue: cited in the answer.',
      alt: (parts: string) => `Context passages by estimated tokens: ${parts}.`,
    },
    window: {
      used: 'input',
      reserved: 'room for the answer',
      window: (n: string) => `${n}-token context window`,
      share: (pct: string) => `${pct} of the window`,
      noWindow: 'This model’s window size is not recorded, so only the input is drawn.',
      parts: { system: 'system prompt', passages: 'passages', question: 'question' },
      caption:
        'Top: how much of the model’s window this request fills. Bottom: what the input is made of (split estimated from word counts; the total is exact).',
      captionNoWindow:
        'What the input is made of (split estimated from word counts; the total is exact).',
      alt: (tokens: string, share: string) => `The request uses ${tokens} input tokens${share}.`,
    },
    cost: {
      input: 'input',
      output: 'output',
      caption: 'Where this answer’s cost went: reading the prompt versus writing the answer.',
      alt: (input: string, output: string) => `Input cost ${input}, output cost ${output}.`,
    },
    citations: {
      sentence: 'answer text',
      caption:
        'Which passage backs which part of the answer. An empty column is a passage the model never cited.',
      cited: 'cited',
      notCited: 'not cited',
      unused: 'unused',
    },
  },
  why: 'Why this step?',
  underTheHood: 'Under the hood',
  showCode: (n: number) => `Show the code (${n} ${n === 1 ? 'excerpt' : 'excerpts'})`,
  hideCode: 'Hide the code',
  expandStep: 'Show details',
  showPrompt: 'Show the full request',
  hidePrompt: 'Hide the full request',
  showPassage: 'Read passage',
  hidePassage: 'Hide passage',
  resultLabel: 'Result',
  sourcesLabel: 'Sources',
  abstained: 'The model found no answer in the retrieved passages and said so.',
  noCitations: 'The answer cites no passage. Treat it with suspicion.',
  unused: (n: number) => (n === 1 ? '1 passage was not cited.' : `${n} passages were not cited.`),
  totals: 'Total',
  status: {
    pending: 'waiting',
    running: 'working',
    ok: 'done',
    skipped: 'skipped',
    warning: 'check',
    error: 'failed',
  },
  starting:
    'Starting the lab… The server sleeps when nobody is using it and takes a few seconds to wake.',
  offline: "Can't reach the API.",
  retry: 'Try again',
  illustrative:
    'Offline mode: this server runs fake providers (hashed word vectors and an extractive stand-in for Claude). Scores, tokens and answers are illustrative, not real model output.',
  budgetDegraded: (spent: string, cap: string) =>
    `${spent} of this month’s ${cap} API budget is spent, so the expensive features are switched off.`,
  budgetStopped: (cap: string) =>
    `This month’s ${cap} API budget is used up, so live questions are paused until the 1st (UTC).`,
  theme: { toDark: 'Switch to the dark pad', toLight: 'Switch to the light pad' },
  footer: {
    corpus: 'Corpus: SQuAD 2.0 dev set (Rajpurkar et al.), Wikipedia text under CC BY-SA 4.0.',
    code: 'Source on GitHub',
    author: 'highnet.at',
  },
  announce: (label: string, title: string, status: string, ms: string) =>
    `Step ${label}, ${title}: ${status} in ${ms}.`,
} as const;
