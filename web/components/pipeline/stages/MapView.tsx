import { Typography } from '@/components/ui/Typography';
import type { MapData } from '@/lib/stage-data';

import { Facts } from './Facts';

type MapViewProps = { data: MapData };

const MapView = ({ data }: MapViewProps) => {
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
      <Typography variant="small" color="muted">
        The drawn map of the whole corpus arrives in milestone 4; these are its coordinates.
      </Typography>
    </div>
  );
};

export { MapView };
