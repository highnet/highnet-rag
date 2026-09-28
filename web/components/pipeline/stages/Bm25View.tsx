import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { Bm25Data } from '@/lib/stage-data';

import { RankTable } from './RankTable';

type Bm25ViewProps = { data: Bm25Data };

const Bm25View = ({ data }: Bm25ViewProps) => {
  const T = COPY.stageText;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Typography variant="label" color="muted" as="p">
          {T.matchLabel}
        </Typography>
        <code className="voice-data block rounded-sm border border-dashed px-3 py-2 text-sm break-words">
          {data.fts_query || T.emptyMatch}
        </code>
      </div>
      <Typography variant="small" color="muted">
        {T.bm25(data.searched.toLocaleString('en'), data.chunk_set, data.depth)}
      </Typography>
      {data.results.length > 0 && (
        <RankTable
          caption="BM25 keyword search results"
          series="bm25"
          valueLabel="score"
          rows={data.results.map((r) => ({ ...r, value: r.score.toFixed(2) }))}
        />
      )}
    </div>
  );
};

export { Bm25View };
