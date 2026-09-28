import { type ReactNode } from 'react';

import { Typography } from '@/components/ui/Typography';
import type { StageCopy } from '@/content/stages';
import { pad2 } from '@/lib/format';
import { cn } from '@/lib/utils';

import { Readout } from './Readout';
import { StatusMark, type StepStatus } from './StatusMark';
import { WhyThisStep } from './WhyThisStep';

type StepSheetProps = {
  number: number;
  copy: StageCopy;
  status: StepStatus;
  measure?: { ms: number; tokens: number; costUsd: number };
  children?: ReactNode;
};

// One numbered step of the calculation: number in the margin, the working on a sheet,
// and the blue-pencil note beside it (below it on narrow screens).
const StepSheet = ({ number, copy, status, measure, children }: StepSheetProps) => {
  const quiet = status === 'pending' || status === 'skipped';
  const headingId = `step-${number}-title`;
  return (
    <li
      aria-labelledby={headingId}
      data-status={status}
      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-x-4 lg:grid-cols-[3rem_minmax(0,1fr)_17rem] lg:gap-x-8"
    >
      <span
        aria-hidden
        className={cn(
          'voice-data pt-4 text-right text-sm md:text-base',
          status === 'running' ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {pad2(number)}
      </span>
      <article
        className={cn(
          'min-w-0 rounded-md border px-4 py-4 md:px-5',
          quiet ? 'border-dashed bg-transparent' : 'animate-write-in bg-card',
          status === 'running' && 'border-primary',
          status === 'error' && 'border-destructive',
        )}
      >
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Typography
            variant="stepHeading"
            id={headingId}
            className={cn(quiet && 'text-base font-medium text-muted-foreground')}
          >
            {copy.title}
          </Typography>
          <div className="flex items-center gap-3">
            {measure && status !== 'skipped' && (
              <Readout ms={measure.ms} tokens={measure.tokens} costUsd={measure.costUsd} />
            )}
            <StatusMark status={status} />
          </div>
        </header>
        {children && <div className="mt-3">{children}</div>}
        {status !== 'pending' && (
          <WhyThisStep copy={copy} layout="inline" className="mt-4 lg:hidden" />
        )}
      </article>
      <WhyThisStep copy={copy} layout="margin" className="hidden lg:block" />
    </li>
  );
};

export { StepSheet };
