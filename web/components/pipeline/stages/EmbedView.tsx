import type { EmbedData } from '@/lib/stage-data';

import { EmbedFigure } from '../figures/EmbedFigure';
import { Facts } from './Facts';

type EmbedViewProps = { data: EmbedData };

const EmbedView = ({ data }: EmbedViewProps) => {
  return (
    <div className="space-y-3">
      <EmbedFigure data={data} />
      <Facts
        facts={[
          { term: 'Model', value: `${data.provider} · ${data.model}` },
          { term: 'Dimensions', value: data.dims },
          { term: 'Length', value: data.norm.toFixed(4) },
        ]}
      />
    </div>
  );
};

export { EmbedView };
