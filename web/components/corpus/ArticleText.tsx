import type { CorpusDocument } from '@/lib/api';
import { chunkSegments } from '@/lib/chunk-segments';
import { cn } from '@/lib/utils';
import { Typography } from '@/components/ui/Typography';
import { CORPUS } from '@/content/corpus';

type ArticleTextProps = {
  doc: CorpusDocument;
  overlapTokens: number;
};

// The article as the searches see it: cut into chunks. Each chunk's start is marked with its id
// in blue pencil; text held by two chunks at once (the overlap) sits on a blue wash.
const ArticleText = ({ doc, overlapTokens }: ArticleTextProps) => {
  const segments = chunkSegments(doc);
  const overlaps = segments.filter((s) => s.depth > 1).length;
  return (
    <>
      <Typography variant="marginNote">
        {CORPUS.legend} {overlaps ? CORPUS.overlap(overlaps) : CORPUS.noOverlap(overlapTokens)}
      </Typography>
      <div className="mt-4 max-w-[72ch] text-base leading-relaxed whitespace-pre-line">
        {segments.map((segment) => (
          <span key={segment.start}>
            {segment.starts.map((id) => (
              <span
                key={id}
                id={`chunk-${id}`}
                className="voice-data mx-0.5 inline-block rounded-sm border border-primary/60 px-1 align-[0.15em] text-[11px] leading-tight text-primary"
              >
                <span className="sr-only">{CORPUS.markerLabel(id)}</span>
                <span aria-hidden>#{id}</span>
              </span>
            ))}
            <span className={cn(segment.depth > 1 && 'bg-accent')}>
              {doc.text.slice(segment.start, segment.end)}
            </span>
          </span>
        ))}
      </div>
    </>
  );
};

export { ArticleText };
