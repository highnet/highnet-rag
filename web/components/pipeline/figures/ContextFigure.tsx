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
    };
  });
  return (
    <Figure
      caption={cited.size > 0 ? `${F.caption} ${F.citedNote}` : F.caption}
      alt={F.alt(data.chunks.map((c) => `[${c.rank}] ~${c.approx_tokens}`).join(', '))}
    >
      <Bar
        max={total}
        segments={data.chunks.map((c) => ({
          key: String(c.chunk_id),
          value: c.approx_tokens,
          tone: cited.has(c.chunk_id) ? 'pencil' : 'soft',
        }))}
      />
      <div className="voice-data relative h-4 text-xs text-muted-foreground">
        {labels
          .filter((l) => l.wide)
          .map((l) => (
            <span
              key={l.rank}
              className="absolute -translate-x-1/2"
              style={{ left: pct(l.left, total) }}
            >
              [{l.rank}]
            </span>
          ))}
      </div>
    </Figure>
  );
};

export { ContextFigure };
