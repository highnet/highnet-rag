import type { ContextChunk } from '@/lib/stage-data';

type RankTableProps = {
  caption: string;
  rows: Pick<ContextChunk, 'chunk_id' | 'rank' | 'doc_title' | 'distance'>[];
};

// Fixed columns; only the values change between runs, so rankings can be compared by eye.
const RankTable = ({ caption, rows }: RankTableProps) => {
  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="voice-data border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="w-10 py-1.5 pr-3 font-medium">
              rank
            </th>
            <th scope="col" className="py-1.5 pr-3 font-medium">
              passage
            </th>
            <th scope="col" className="w-20 py-1.5 text-right font-medium">
              distance
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.chunk_id} className="border-b border-dashed last:border-b-0">
              <td className="voice-data py-2 pr-3 text-chart-1">{row.rank}</td>
              <td className="py-2 pr-3">
                <a href={`#chunk-${row.chunk_id}`} className="hover:text-primary hover:underline">
                  {row.doc_title}
                </a>{' '}
                <span className="voice-data text-xs text-muted-foreground">#{row.chunk_id}</span>
              </td>
              <td className="voice-data py-2 text-right">{row.distance.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { RankTable };
