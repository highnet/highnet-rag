import { type ReactNode } from 'react';

import { Bar, type BarSegment } from '@/components/pipeline/figures/Bar';
import { EVALS } from '@/content/evals';
import type { Rate } from '@/lib/generated/evals';
import { cn } from '@/lib/utils';

type MeasureProps = {
  label: string;
  rate?: Rate;
  value?: number | null;
  tone?: BarSegment['tone'];
};

// One measured share: its label, a bar on a 0–100% scale and the value with its counts, so the
// reader sees "41 of 50" as well as "82%". A missing value (nothing to measure) reads as a dash.
const Measure = ({ label, rate, value, tone = 'ink' }: MeasureProps) => {
  const share = rate ? rate.value : value;
  return (
    <div data-slot="measure" className="space-y-1">
      <dt className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span>{label}</span>
        <span className="voice-data text-sm">
          <span className="font-semibold">{EVALS.percent(share)}</span>
          {rate && (
            <span className="ml-2 text-muted-foreground">{EVALS.ofCount(rate.count, rate.of)}</span>
          )}
        </span>
      </dt>
      <dd>
        <Bar segments={[{ key: 'v', value: share ?? 0, tone }]} max={1} size="sm" />
      </dd>
    </div>
  );
};

type MeasureListProps = { children: ReactNode; className?: string };

const MeasureList = ({ children, className }: MeasureListProps) => {
  return <dl className={cn('space-y-3', className)}>{children}</dl>;
};

export { Measure, MeasureList };
