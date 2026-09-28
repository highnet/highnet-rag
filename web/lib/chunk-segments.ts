import type { CorpusDocument } from '@/lib/api';

export type Segment = {
  start: number;
  end: number;
  // Chunk ids that begin exactly here (drawn as markers before the text).
  starts: number[];
  // How many chunks hold this stretch: 2 means it sits in the overlap between neighbours.
  depth: number;
};

// Cuts an article at every chunk boundary, so each stretch of text knows which chunks hold it.
export const chunkSegments = (doc: CorpusDocument): Segment[] => {
  const cuts = [
    ...new Set([0, doc.text.length, ...doc.chunks.flatMap((c) => [c.start, c.end])]),
  ].sort((a, b) => a - b);
  return cuts.slice(0, -1).map((start, i) => {
    const end = cuts[i + 1];
    return {
      start,
      end,
      starts: doc.chunks.filter((c) => c.start === start).map((c) => c.id),
      depth: doc.chunks.filter((c) => c.start <= start && c.end >= end).length,
    };
  });
};
