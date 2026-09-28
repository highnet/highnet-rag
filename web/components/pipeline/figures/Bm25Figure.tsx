import { Fragment } from 'react';

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
      alt={F.alt(data.terms.map((t) => `${t.term} ${t.idf.toFixed(2)}`).join(', '))}
    >
      <p className="text-base leading-relaxed">
        {data.words.map((w, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <span
              title={w.term ? undefined : F.stopWord}
              className={cn(
                w.term
                  ? 'font-semibold text-primary underline decoration-primary underline-offset-4'
                  : 'text-muted-foreground',
              )}
            >
              {w.word}
            </span>
          </Fragment>
        ))}
      </p>
      {data.terms.length > 0 && (
        <div className="grid grid-cols-[auto_minmax(3rem,1fr)] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[auto_minmax(4rem,1fr)_auto]">
          {data.terms.map((t) => (
            <div key={t.term} className="contents">
              <span className="voice-data">{t.term}</span>
              <Bar max={maxIdf} segments={[{ key: 'idf', value: t.idf, tone: 'bm25' }]} />
              <span className="voice-data col-span-2 text-xs text-muted-foreground sm:col-span-1 sm:text-right">
                idf {t.idf.toFixed(2)} · {F.inChunks(t.chunks, searched)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Figure>
  );
};

export { Bm25Figure };
