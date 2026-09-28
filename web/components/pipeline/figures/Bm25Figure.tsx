import { Fragment } from 'react';

import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { Bm25Data } from '@/lib/stage-data';
import { cn } from '@/lib/utils';

import { Bar } from './Bar';
import { Figure } from './Figure';

type Bm25FigureProps = { data: Bm25Data };

const F = COPY.figures.bm25;

// The question with its search terms picked out, then each term's weight (IDF) as a bar.
const Bm25Figure = ({ data }: Bm25FigureProps) => {
  const maxIdf = Math.max(...data.terms.map((t) => t.idf), 1e-6);
  const searched = data.searched.toLocaleString('en');
  return (
    <Figure
      caption={F.caption}
      alt={F.alt(
        data.terms.map((t) => F.term(t.term, t.idf.toFixed(2), t.chunks, searched)).join('; '),
        data.words
          .filter((w) => !w.term)
          .map((w) => w.word)
          .join(', '),
      )}
    >
      <Typography variant="body">
        {data.words.map((w, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <span
              title={w.term ? undefined : F.stopWord}
              className={cn(
                w.term
                  ? 'font-semibold text-foreground underline decoration-chart-2 decoration-2 underline-offset-4'
                  : 'text-muted-foreground',
              )}
            >
              {w.word}
            </span>
          </Fragment>
        ))}
      </Typography>
      {data.terms.length > 0 && (
        <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm">
          {data.terms.map((t) => (
            <div key={t.term} className="contents">
              <span className="voice-data">{t.term}</span>
              <Bar max={maxIdf} segments={[{ key: 'idf', value: t.idf, tone: 'bm25' }]} />
              <Typography variant="label" color="muted" as="span" className="text-right">
                <span className="sm:hidden">
                  {t.idf.toFixed(2)} · {F.inChunksShort(t.chunks, searched)}
                </span>
                <span className="max-sm:hidden">
                  idf {t.idf.toFixed(2)} · {F.inChunks(t.chunks, searched)}
                </span>
              </Typography>
            </div>
          ))}
        </div>
      )}
    </Figure>
  );
};

export { Bm25Figure };
