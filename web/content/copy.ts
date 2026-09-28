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
    context: (n: number, tokens: string) => `${n} passages · ~${tokens} tokens`,
    prompt: (tokens: string, worstCase: string) => `${tokens} in · ${worstCase} worst case`,
    generate: (tokens: string, stop: string) => `${tokens} out · ${stop}`,
    unknownStop: 'unknown stop',
    abstained: 'No answer in the passages',
    citations: (n: number) => (n === 1 ? '1 citation' : `${n} citations`),
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
