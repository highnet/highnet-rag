import { Check } from 'lucide-react';

import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { ContextData } from '@/lib/stage-data';

import { Bar, pct } from './Bar';
import { Figure } from './Figure';

type ContextFigureProps = { data: ContextData; cited: Set<number> };

const F = COPY.figures.context;

// The context as one bar, a segment per passage sized by its estimated tokens. Once the
// answer is in, cited passages turn blue pencil.
const ContextFigure = ({ data, cited }: ContextFigureProps) => {
  const total = Math.max(data.context_tokens_approx, 1);
  // Each label sits over the middle of its segment: tokens before it plus half its own.
  const labels = data.chunks.map((c, i) => {
    const before = data.chunks.slice(0, i).reduce((sum, p) => sum + p.approx_tokens, 0);
    return {
      rank: c.rank,
      left: before + c.approx_tokens / 2,
      wide: c.approx_tokens / total > 0.05,
      cited: cited.has(c.chunk_id),
    };
  });
  return (
    <Figure
      caption={cited.size > 0 ? `${F.caption} ${F.citedNote}` : F.caption}
      alt={F.alt(
        data.chunks.map((c) => F.part(c.rank, c.approx_tokens, cited.has(c.chunk_id))).join(', '),
      )}
    >
      <Bar
        max={total}
        segments={data.chunks.map((c) => ({
          key: String(c.chunk_id),
          value: c.approx_tokens,
          tone: cited.has(c.chunk_id) ? 'pencil' : 'soft',
        }))}
      />
      {/* A cited passage always gets its label and a tick, so the state never rests on colour. */}
      <div className="relative h-4">
        {labels
          .filter((l) => l.wide || l.cited)
          .map((l) => (
            <Typography
              key={l.rank}
              variant="label"
              color="muted"
              as="span"
              className="absolute inline-flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap"
              style={{ left: pct(l.left, total) }}
            >
              [{l.rank}]{l.cited && <Check aria-hidden className="size-3 text-primary" />}
            </Typography>
          ))}
      </div>
    </Figure>
  );
};

export { ContextFigure };
