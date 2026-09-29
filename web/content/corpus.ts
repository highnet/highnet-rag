// English copy for the /corpus page.

export const CORPUS = {
  sheetLabel: 'Sheet 3',
  title: 'The corpus',
  metaTitle: 'Corpus: the 35 Wikipedia articles',
  metaDescription:
    'The 35 Wikipedia articles highnet-rag answers from, with the text of each and where its chunks fall at every chunk size.',
  lede: 'Every answer comes from these 35 English Wikipedia articles, the SQuAD 2.0 dev set (CC BY-SA 4.0). Before any question is asked, we cut each article into chunks at three sizes. The searches only ever see chunks, never whole articles. Pick an article to read it and see where its chunks fall.',
  loading: 'Loading the corpus…',
  error: (message: string) => `The corpus could not be loaded. ${message}`,
  retry: 'Try again',
  articlesLabel: 'Article',
  articleCount: (n: number) => `${n} articles`,
  chunkSizeLabel: 'Chunk size',
  listMeta: (chunks: number, chars: number) =>
    `${chunks} chunks · ${chars.toLocaleString('en')} characters`,
  articleSummary: (chunks: number, target: number, overlap: number) =>
    `${chunks} chunks of about ${target} tokens each, overlapping by about ${overlap} tokens.`,
  source: 'Read it on Wikipedia',
  markerLabel: (id: number) => `Chunk ${id} starts`,
  legend: 'Each blue number marks where a chunk starts.',
  overlap: (places: number) =>
    `Shaded text sits in two chunks at once (${places} ${places === 1 ? 'place' : 'places'}): the overlap keeps a sentence near a boundary whole in both neighbours.`,
  noOverlap: (tokens: number) =>
    `Here the chunks meet end to end. The overlap is taken in whole sentences, and no sentence at the end of a chunk fits in about ${tokens} tokens.`,
  loadingArticle: 'Loading the article…',
};
