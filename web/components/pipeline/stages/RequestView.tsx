import { Typography } from '@/components/ui/Typography';
import { formatUsd } from '@/lib/format';
import type { RequestData } from '@/lib/stage-data';

import { Facts } from './Facts';

type RequestViewProps = { data: RequestData };

const RequestView = ({ data }: RequestViewProps) => {
  const { rate_limit: rate, budget } = data;
  return (
    <div className="space-y-3">
      {data.error && <Typography color="destructive">{data.error.message}</Typography>}
      <Facts
        facts={[
          {
            term: 'Rate limit',
            value: `${rate.remaining_minute}/${rate.limit_minute} left this minute · ${rate.remaining_day}/${rate.limit_day} today`,
          },
          {
            term: 'Budget',
            value: `${formatUsd(budget.spent_usd)} of ${formatUsd(budget.cap_usd)} spent this month (${budget.tier})`,
          },
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
