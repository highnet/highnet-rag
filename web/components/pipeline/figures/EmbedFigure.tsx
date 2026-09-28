import { COPY } from '@/content/copy';
import type { EmbedData } from '@/lib/stage-data';
import { cn } from '@/lib/utils';

import { Figure } from './Figure';

type EmbedFigureProps = { data: EmbedData };

const F = COPY.figures.embed;

// The first coordinates of the query vector as bars above and below a zero line.
const EmbedFigure = ({ data }: EmbedFigureProps) => {
  const values = data.vector_preview;
  const scale = Math.max(...values.map(Math.abs), 1e-9);
  return (
    <Figure
      caption={F.caption(values.length, data.dims)}
      alt={F.alt(values.map((v) => v.toFixed(4)).join(', '))}
    >
      <div className="flex h-20 items-stretch gap-1.5 border-y border-dashed py-1">
        {values.map((value, i) => (
          <div key={i} className="relative flex-1">
            <div className="absolute inset-x-0 top-1/2 h-px bg-input" />
            <div
              className={cn('absolute inset-x-1 bg-chart-1', value >= 0 ? 'bottom-1/2' : 'top-1/2')}
              style={{ height: `${(Math.abs(value) / scale) * 50}%` }}
            />
          </div>
        ))}
      </div>
      <div className="voice-data flex gap-1.5 text-center text-xs text-muted-foreground">
        {values.map((value, i) => (
          <span key={i} className="flex-1 truncate">
            {value.toFixed(3)}
          </span>
        ))}
      </div>
    </Figure>
  );
};

export { EmbedFigure };
