import { COPY } from '@/content/copy';
import { formatUsd } from '@/lib/format';
import type { RequestData } from '@/lib/stage-data';

import { Bar } from './Bar';
import { Figure } from './Figure';

type RequestFigureProps = { data: RequestData };

const F = COPY.figures.request;

// Three meters: requests used this minute and today, and the month's spend against the cap.
const RequestFigure = ({ data }: RequestFigureProps) => {
  const { rate_limit: rate, budget } = data;
  const usedMinute = rate.limit_minute - rate.remaining_minute;
  const usedDay = rate.limit_day - rate.remaining_day;
  const budgetTone =
    budget.tier === 'stopped' ? 'destructive' : budget.tier === 'degraded' ? 'warning' : 'pencil';
  const rows = [
    {
      label: F.minute,
      bar: <Bar max={rate.limit_minute} segments={[{ key: 'used', value: usedMinute }]} />,
      value: `${usedMinute}/${rate.limit_minute}`,
    },
    {
      label: F.day,
      bar: <Bar max={rate.limit_day} segments={[{ key: 'used', value: usedDay }]} />,
      value: `${usedDay}/${rate.limit_day}`,
    },
    {
      label: F.budget,
      bar: (
        <Bar
          max={budget.cap_usd}
          marks={[budget.degrade_at_usd]}
          segments={[{ key: 'spent', value: budget.spent_usd, tone: budgetTone }]}
        />
      ),
      value: `${formatUsd(budget.spent_usd)}/${formatUsd(budget.cap_usd)}`,
    },
  ];
  return (
    <Figure
      caption={F.caption}
      alt={F.alt(
        `${usedMinute} of ${rate.limit_minute}`,
        `${usedDay} of ${rate.limit_day}`,
        formatUsd(budget.spent_usd),
        formatUsd(budget.cap_usd),
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <span className="text-muted-foreground">{row.label}</span>
            {row.bar}
            <span className="voice-data text-right">{row.value}</span>
          </div>
        ))}
      </div>
    </Figure>
  );
};

export { RequestFigure };
