import { Typography } from '@/components/ui/Typography';
import type { ContextChunk, MapData } from '@/lib/stage-data';

import { CorpusMap } from '../figures/CorpusMap';

import { Facts } from './Facts';

type MapViewProps = { data: MapData; chunkSet?: string; retrieved: ContextChunk[] };

const MapView = ({ data, chunkSet, retrieved }: MapViewProps) => {
  if (data.error) {
    return <Typography color="warning">{data.error.message}</Typography>;
  }
  const [pc1, pc2] = data.explained_variance;
  const kept = ((pc1 + pc2) * 100).toFixed(1);
  return (
    <div className="space-y-3">
      <Facts
        facts={[
          { term: 'Position', value: `x ${data.x.toFixed(3)}, y ${data.y.toFixed(3)}` },
          {
            term: 'Spread kept',
            value: `${kept}% (PC1 ${(pc1 * 100).toFixed(1)}%, PC2 ${(pc2 * 100).toFixed(1)}%)`,
          },
          { term: 'Nearest on map', value: data.neighbours_2d.map((id) => `#${id}`).join(' ') },
        ]}
      />
      {chunkSet && (
        <CorpusMap
          key={chunkSet}
          chunkSet={chunkSet}
          query={{ x: data.x, y: data.y }}
          explained={data.explained_variance}
          neighbours={data.neighbours_2d}
          retrieved={retrieved}
        />
      )}
    </div>
  );
};

export { MapView };
