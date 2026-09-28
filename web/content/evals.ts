// English copy for the /evals page. Every number is passed in from evals/results/latest.json.

const MODE_NAMES: Record<string, string> = { bm25: 'BM25', vector: 'Vector', hybrid: 'Hybrid' };
const CHUNK_NAMES: Record<string, string> = { small: 'Small', medium: 'Medium', large: 'Large' };

export const EVALS = {
  title: 'How well does it work?',
  sheetLabel: 'Sheet 2',
  metaTitle: 'Evals · highnet-rag',
  metaDescription:
    'Recall, MRR, faithfulness and abstention for the highnet-rag pipeline, measured offline over golden question sets with real models.',

  lede: (questions: number, graded: boolean) =>
    graded
      ? `We put ${questions.toLocaleString('en')} questions with known answers through the real pipeline and graded what came out. Every number on this page comes from that one run; none is typed in by hand.`
      : `We searched for the answers to ${questions.toLocaleString('en')} questions whose answers we know exactly, through every search setting the pipeline offers. Every number on this page comes from that one run; none is typed in by hand.`,
  runFacts: {
    date: 'Run',
    corpus: 'Corpus build',
    models: 'Models called',
    cost: 'Run cost',
    costNote: 'paid separately from the visitor budget',
  },
  illustrative:
    'These numbers come from the offline stand-in models (hashed word vectors, an extractive “LLM” and a word-overlap judge). They show the page working, not how good the real pipeline is.',
  empty: {
    title: 'No eval run has been published yet.',
    body: 'The evals run offline with the real models and publish their results here. Until the first run lands, there is nothing honest to show.',
  },

  retrieval: {
    title: 'Does the search find the answer?',
    note: (questions: number) =>
      `For each of ${questions} answerable questions we know exactly where the answer sits in its article. recall@5 is the share of questions where a passage containing that answer was among the top 5 retrieved. The model can only answer from what it is given, so this caps everything that follows.`,
    mrrNote:
      'MRR (mean reciprocal rank) rewards finding the answer early: 1 when it is the top passage, ½ when second, ⅓ when third, and 0 when it is not in the top 10.',
    metricLabel: 'Measure',
    metric: (key: string) => (key === 'mrr' ? 'MRR' : `recall@${key}`),
    metricPrefix: 'recall',
    chunkCaption: (name: string, tokens: number | null) =>
      `${CHUNK_NAMES[name] ?? name} chunks${tokens ? ` (~${tokens} tokens)` : ''}`,
    mode: (name: string) => MODE_NAMES[name] ?? name,
    columns: { mode: 'Search', off: 'Reranker off', on: 'Reranker on' },
    yours: 'your settings',
    cellLabel: (metric: string, value: string, questions: number, errors: number) =>
      `${metric} ${value}, over ${questions} questions${errors ? `, ${errors} failed` : ''}`,
    unmatched: (n: number, set: string) =>
      `${n} question${n === 1 ? '' : 's'} left out for ${set} chunks: no single chunk holds the whole answer.`,
    tableToggle: 'Every configuration: all measures, time and cost',
    tableCaption: 'All retrieval configurations',
    timeNote:
      'Search time covers the searches, fusion and reranking. Embedding the question is left out: the run embeds each question once and reuses it.',
    tableHeads: {
      config: 'Configuration',
      questions: 'Questions',
      mrr: 'MRR',
      ms: 'Search time',
      cost: 'Cost',
    },
    configName: (mode: string, chunkSet: string, rerank: boolean) =>
      `${MODE_NAMES[mode] ?? mode} · ${(CHUNK_NAMES[chunkSet] ?? chunkSet).toLowerCase()}${rerank ? ' · rerank' : ''}`,
  },

  answers: {
    title: 'Does the answer stick to the passages?',
    config: (mode: string, chunkSet: string, k: number, rerank: boolean) =>
      `Every question ran end to end with the default settings: ${(MODE_NAMES[mode] ?? mode).toLowerCase()} search, ${chunkSet} chunks, top ${k}, reranker ${rerank ? 'on' : 'off'}.`,
    note: 'A judge model reads the question, the passages sent, and the answer sentence by sentence. It marks each sentence as supported by the passages or not, and the answer as correct or not against the known answer. A second, stronger model grades the first; it can still be wrong, so treat these as estimates.',
    answerable: (n: number) => `The ${n} answerable questions`,
    unanswerable: (n: number) => `The ${n} questions the corpus cannot answer`,
    evidence: 'The passage with the answer was sent',
    correct: 'Answered correctly',
    correctWithEvidence: 'Correct, when that passage was sent',
    abstainedWrongly: 'Declined, although the answer was there',
    abstainedRightly: 'Declined, as it should',
    faithfulness: 'Sentences backed by the passages (mean)',
    fullySupported: 'Answers with every sentence backed',
    faithfulnessGiven: 'Sentences backed, in answers given anyway (mean)',
    takeaway:
      'Compare the first two lines: when the right passage is not among those sent, the model has nothing to answer from. Retrieval decides the answer.',
  },

  compound: {
    title: 'Does the agent help with two-part questions?',
    note: (n: number) =>
      `${n} questions each need a fact from two different articles. One search tends to find one article; in agentic mode Claude splits the question and searches for each part.`,
    columns: { measure: 'Measure', classic: 'One search', agentic: 'Agentic' },
    allFound: 'Every needed article was in the passages',
    coverage: 'Share of needed articles found (mean)',
    correct: 'Answered correctly',
    abstained: 'Declined to answer',
    searches: 'Searches per question',
    tokens: 'Tokens per question',
    time: 'Time per question',
    cost: 'Cost per question',
  },

  sets: {
    title: 'Where the questions come from',
    squad_auto: 'SQuAD 2.0 dev, picked automatically',
    owner: 'Written by the owner',
    compound: 'Cross-article, for agentic mode',
    counts: (answerable: number, unanswerable: number) =>
      unanswerable ? `${answerable} answerable, ${unanswerable} not` : `${answerable} answerable`,
    pending: 'not written yet',
  },

  cost: {
    title: 'What the run cost',
    caption: 'Every call in the eval run, by model',
    heads: {
      model: 'Model',
      calls: 'Calls',
      input: 'Tokens in',
      output: 'Tokens out',
      cost: 'Cost',
    },
    total: 'Total',
    details: 'Every question’s answer and grade',
  },

  notMeasured: {
    label: 'Not measured in this run',
    body: 'Measuring this means generating an answer for every question and having a judge model grade it, which costs model calls. To keep eval spend to cents, this run measured retrieval only.',
  },

  fromPipeline: 'How good is this configuration?',
  percent: (value: number | null | undefined) =>
    value === null || value === undefined ? '–' : `${Math.round(value * 100)}%`,
  ofCount: (count: number, of: number) => `${count} of ${of}`,
};
