import type { EmbedData } from '@/lib/stage-data';

import { Facts } from './Facts';

type EmbedViewProps = { data: EmbedData };

const EmbedView = ({ data }: EmbedViewProps) => {
  return (
    <div className="space-y-3">
      <p className="voice-data overflow-x-auto border-y border-dashed py-2 text-sm whitespace-nowrap">
        [{data.vector_preview.map((v) => v.toFixed(4)).join(', ')}, … {data.dims - 8} more]
      </p>
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
