import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { VectorData } from '@/lib/stage-data';
import { cn } from '@/lib/utils';

import { SeriesMarker } from '../stages/RankBadge';
import { pct } from './Bar';
import { Figure } from './Figure';

type DistanceFigureProps = { data: VectorData };

const F = COPY.figures.distance;

type AxisProps = { from: number; to: number; ticks: number[]; label: string };

const Axis = ({ from, to, ticks, label }: AxisProps) => {
  return (
    <div className="relative h-5">
      {ticks.map((t) => (
        <Typography
          key={t}
          variant="label"
          color="muted"
          as="span"
          className={cn(
            'absolute top-0',
            t === from ? '' : t === to ? '-translate-x-full' : '-translate-x-1/2',
          )}
          style={{ left: pct(t - from, to - from) }}
        >
          {t.toFixed(to - from < 0.1 ? 4 : 1)}
        </Typography>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
};

// Cosine distances on the whole 0-1 scale, then the occupied stretch magnified with one
// circle per passage. Close distances look identical at full scale; the zoom shows the order.
const DistanceFigure = ({ data }: DistanceFigureProps) => {
  const distances = data.results.map((r) => r.distance);
  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const pad = Math.max((max - min) * 0.1, 0.002);
  const lo = Math.max(min - pad, 0);
  const hi = max + pad;
  return (
    <Figure caption={F.caption} alt={F.alt(data.results.length, min.toFixed(4), max.toFixed(4))}>
      <div className="space-y-1">
        <div className="relative h-3">
          <div className="absolute inset-x-0 top-1/2 h-px bg-input" />
          <div
            className="absolute inset-y-0 border-x border-chart-1 bg-chart-1/25"
            style={{ left: pct(lo, 1), width: pct(hi - lo, 1) }}
          />
        </div>
        <Axis from={0} to={1} ticks={[0, 0.5, 1]} label={F.full} />
      </div>
      <div className="space-y-1 border-t border-dashed pt-2">
        <div className="relative h-10">
          <div className="absolute inset-x-0 top-1/2 h-px bg-input" />
          {data.results.map((r) => (
            <span
              key={r.chunk_id}
              className={cn(
                'absolute flex -translate-x-1/2 flex-col items-center text-chart-1',
                r.rank % 2 ? 'top-0' : 'top-[calc(50%-5px)] flex-col-reverse',
              )}
              style={{ left: pct(r.distance - lo, hi - lo) }}
            >
              <span className="voice-data text-[11px] leading-none text-foreground">{r.rank}</span>
              <SeriesMarker series="vector" className="my-0.5" />
            </span>
          ))}
        </div>
        <Axis from={lo} to={hi} ticks={min === max ? [min] : [min, max]} label={F.zoom} />
      </div>
    </Figure>
  );
};

export { DistanceFigure };
