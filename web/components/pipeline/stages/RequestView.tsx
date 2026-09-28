import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { RequestData } from '@/lib/stage-data';

import { RequestFigure } from '../figures/RequestFigure';
import { Facts } from './Facts';

type RequestViewProps = { data: RequestData };

const RequestView = ({ data }: RequestViewProps) => {
  const { budget } = data;
  return (
    <div className="space-y-3">
      {data.error && <Typography color="destructive">{data.error.message}</Typography>}
      {data.recording && (
        <Typography variant="small" color="muted">
          {COPY.replay.recorded(data.recording.recorded_at.slice(0, 10))} {data.recording.note}
        </Typography>
      )}
      <RequestFigure data={data} />
      <Facts
        facts={[
          { term: 'Budget tier', value: budget.tier },
          {
            term: 'Models',
            value: `${data.models.embed.model} → ${data.models.answer.model}`,
          },
        ]}
      />
    </div>
  );
};

export { RequestView };
