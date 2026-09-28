import { COPY } from '@/content/copy';
import { cn } from '@/lib/utils';

import { RankBadge, type Series } from './RankBadge';

export type RankRow = { chunk_id: number; rank: number; doc_title: string; value: string };

type RankTableProps = {
  caption: string;
  series: Series;
  valueLabel: string;
  rows: RankRow[];
  compact?: boolean;
};

// Fixed columns; only the values change between runs, so rankings can be compared by eye.
const RankTable = ({ caption, series, valueLabel, rows, compact }: RankTableProps) => {
  const C = COPY.stageText.columns;
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="voice-data border-b text-left text-xs text-muted-foreground">
          <th scope="col" className="w-12 py-1.5 pr-3 font-medium">
            {C.rank}
          </th>
          <th scope="col" className="py-1.5 pr-3 font-medium">
            {C.passage}
          </th>
          <th scope="col" className="w-20 py-1.5 text-right font-medium">
            {valueLabel}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.chunk_id} className="border-b border-dashed last:border-b-0">
            <td className={cn('pr-3', compact ? 'py-1' : 'py-2')}>
              <RankBadge series={series} rank={row.rank} />
            </td>
            <td className={cn('pr-3', compact ? 'py-1' : 'py-2')}>
              {row.doc_title}{' '}
              <span className="voice-data text-xs text-muted-foreground">#{row.chunk_id}</span>
            </td>
            <td className={cn('voice-data text-right', compact ? 'py-1' : 'py-2')}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export { RankTable };
