import { Typography } from '@/components/ui/Typography';
import type { RequestData } from '@/lib/stage-data';

import { RequestFigure } from '../figures/RequestFigure';
import { Facts } from './Facts';

type RequestViewProps = { data: RequestData };

const RequestView = ({ data }: RequestViewProps) => {
  const { budget } = data;
  return (
    <div className="space-y-3">
      {data.error && <Typography color="destructive">{data.error.message}</Typography>}
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
