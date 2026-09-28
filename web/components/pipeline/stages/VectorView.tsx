import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { VectorData } from '@/lib/stage-data';

import { RankTable } from './RankTable';

type VectorViewProps = { data: VectorData };

const VectorView = ({ data }: VectorViewProps) => {
  return (
    <div className="space-y-3">
      <Typography variant="small" color="muted">
        {COPY.stageText.vector(data.searched.toLocaleString('en'), data.chunk_set, data.depth)}
      </Typography>
      <RankTable
        caption={COPY.stageText.captions.vector}
        series="vector"
        valueLabel={COPY.stageText.columns.distance}
        rows={data.results.map((r) => ({ ...r, value: r.distance.toFixed(4) }))}
      />
    </div>
  );
};

export { VectorView };
