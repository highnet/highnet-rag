import { Typography } from '@/components/ui/Typography';
import type { ContextChunk, VectorData } from '@/lib/stage-data';

import { RankTable } from './RankTable';

type VectorViewProps = { data: VectorData; titles: Map<number, ContextChunk> };

const VectorView = ({ data, titles }: VectorViewProps) => {
  const rows = data.results.map((r) => ({
    ...r,
    doc_title: titles.get(r.chunk_id)?.doc_title ?? 'Passage',
  }));
  return (
    <div className="space-y-3">
      <Typography variant="small" color="muted">
        Compared against all {data.searched.toLocaleString('en')} {data.chunk_set} chunks by{' '}
        {data.metric} distance; the closest {data.results.length} are kept.
      </Typography>
      <RankTable caption="Vector search results" rows={rows} />
    </div>
  );
};

export { VectorView };
