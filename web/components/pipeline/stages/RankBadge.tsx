import { COPY } from '@/content/copy';
import { cn } from '@/lib/utils';

export type Series = 'bm25' | 'vector' | 'fused' | 'rerank';

// Each ranked list has a colour and a marker shape, so the series never relies on colour alone.
const SERIES: Record<Series, { colour: string; marker: string }> = {
  bm25: { colour: 'text-chart-2', marker: 'M1.5 1.5h7v7h-7z' },
  vector: { colour: 'text-chart-1', marker: 'M5 1a4 4 0 1 1 0 8a4 4 0 1 1 0-8z' },
  fused: { colour: 'text-chart-3', marker: 'M5 0.5l4.5 4.5l-4.5 4.5l-4.5-4.5z' },
  rerank: { colour: 'text-chart-4', marker: 'M5 1l4.5 8h-9z' },
};

type SeriesMarkerProps = { series: Series; className?: string };

const SeriesMarker = ({ series, className }: SeriesMarkerProps) => {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 10"
      className={cn('inline-block size-2.5 shrink-0 fill-current', className)}
    >
      <path d={SERIES[series].marker} />
    </svg>
  );
};

type RankBadgeProps = {
  series: Series;
  rank: number | null;
  muted?: boolean;
  className?: string;
};

// A rank in one list: marker, then the number. A missing rank reads as a dash. Muted badges
// (rows below the top-k cut) keep their marker shape but lose the series colour.
const RankBadge = ({ series, rank, muted, className }: RankBadgeProps) => {
  const label = COPY.stageText.series[series];
  const quiet = muted || rank === null;
  return (
    <span
      data-slot="rank-badge"
      className={cn(
        'voice-data inline-flex items-center gap-1 tabular-nums',
        quiet ? 'text-muted-foreground' : SERIES[series].colour,
        className,
      )}
    >
      <SeriesMarker series={series} className={cn(rank === null && 'opacity-40')} />
      <span aria-hidden className={cn(!quiet && 'text-foreground')}>
        {rank ?? '–'}
      </span>
      <span className="sr-only">
        {rank === null ? COPY.stageText.notInList(label) : COPY.stageText.inList(label, rank)}
      </span>
    </span>
  );
};

export { RankBadge, SERIES, SeriesMarker };
