import { cn } from '@/lib/utils';

export type Series = 'bm25' | 'vector' | 'fused';

// Each ranked list has a colour and a marker shape, so the series never relies on colour alone.
const SERIES: Record<Series, { label: string; colour: string; marker: string }> = {
  bm25: { label: 'BM25', colour: 'text-chart-2', marker: 'M1.5 1.5h7v7h-7z' },
  vector: { label: 'vector', colour: 'text-chart-1', marker: 'M5 1a4 4 0 1 1 0 8a4 4 0 1 1 0-8z' },
  fused: { label: 'fused', colour: 'text-chart-3', marker: 'M5 0.5l4.5 4.5l-4.5 4.5l-4.5-4.5z' },
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

type RankBadgeProps = { series: Series; rank: number | null; className?: string };

// A rank in one list: marker, then the number. A missing rank reads as a dash.
const RankBadge = ({ series, rank, className }: RankBadgeProps) => {
  const { label, colour } = SERIES[series];
  return (
    <span
      data-slot="rank-badge"
      className={cn(
        'voice-data inline-flex items-center gap-1 tabular-nums',
        rank === null ? 'text-muted-foreground' : colour,
        className,
      )}
    >
      <SeriesMarker series={series} className={cn(rank === null && 'opacity-40')} />
      <span aria-hidden className={cn(rank !== null && 'text-foreground')}>
        {rank ?? '–'}
      </span>
      <span className="sr-only">
        {rank === null ? `not in the ${label} list` : `${label} rank ${rank}`}
      </span>
    </span>
  );
};

export { RankBadge, SERIES, SeriesMarker };
