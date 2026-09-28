'use client';

import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import type { StageCopy } from '@/content/stages';
import { pad2 } from '@/lib/format';
import type { Snippet } from '@/lib/snippets';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';

import { CodeSnippet } from './CodeSnippet';
import { Readout } from './Readout';
import { StatusMark, type StepStatus } from './StatusMark';
import { WhyThisStep } from './WhyThisStep';

const WIDE = '(min-width: 768px)';

type StepSheetProps = {
  number: number;
  copy: StageCopy;
  status: StepStatus;
  summary?: string;
  snippets: Snippet[];
  measure?: { ms: number; tokens: number; costUsd: number };
  children?: ReactNode;
};

// One numbered step of the calculation: number in the margin, the working on a sheet, and
// the blue-pencil note beside it. On phones each step folds to one line so the page stays short.
const StepSheet = ({
  number,
  copy,
  status,
  summary,
  snippets,
  measure,
  children,
}: StepSheetProps) => {
  const wide = useMediaQuery(WIDE);
  const [open, setOpen] = useState(false);
  const quiet = status === 'pending' || status === 'skipped';
  const headingId = `step-${number}-title`;

  const readout = measure && status !== 'skipped' && (
    <Readout ms={measure.ms} tokens={measure.tokens} costUsd={measure.costUsd} />
  );
  const details = (
    <>
      {children && <div className="mt-3">{children}</div>}
      <div className="mt-3 space-y-1 border-t border-dashed pt-2">
        {status !== 'pending' && (
          <WhyThisStep copy={copy} layout="inline" className="border-t-0 pt-0 lg:hidden" />
        )}
        {status !== 'pending' && <CodeSnippet snippets={snippets} />}
      </div>
    </>
  );

  return (
    <li
      aria-labelledby={headingId}
      data-status={status}
      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-x-4 lg:grid-cols-[3rem_minmax(0,1fr)_17rem] lg:gap-x-8"
    >
      <span
        aria-hidden
        className={cn(
          'voice-data flex flex-col items-end gap-2 self-stretch pt-3 text-sm md:pt-4 md:text-base',
          status === 'running' ? 'text-primary' : 'text-muted-foreground',
          !quiet && 'animate-write-in [animation-duration:120ms]',
        )}
      >
        {pad2(number)}
        {status === 'running' && <span className="w-0.5 flex-1 bg-primary" />}
      </span>

      {wide ? (
        <article
          className={cn(
            'min-w-0 self-start rounded-md border px-5 py-4',
            quiet
              ? 'border-dashed bg-transparent py-3'
              : 'animate-write-in bg-card [animation-delay:40ms] [animation-duration:140ms] motion-reduce:[animation-delay:0ms]',
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
              {readout}
              <StatusMark status={status} />
            </div>
          </header>
          {status !== 'pending' && details}
        </article>
      ) : (
        <Collapsible
          open={open}
          onOpenChange={setOpen}
          className={cn(
            'min-w-0 self-start rounded-md border',
            quiet ? 'border-dashed bg-transparent' : 'bg-card',
            status === 'error' && 'border-destructive',
          )}
        >
          <CollapsibleTrigger className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left">
            <span className="min-w-0 flex-1">
              <Typography
                variant="stepHeading"
                as="span"
                id={headingId}
                className={cn('block text-base', quiet && 'font-medium text-muted-foreground')}
              >
                {copy.title}
              </Typography>
              {summary && (
                <span className="voice-data block truncate text-xs text-muted-foreground">
                  {summary}
                </span>
              )}
            </span>
            <StatusMark status={status} />
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 shrink-0 text-primary transition-transform',
                open && 'rotate-180',
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            {readout}
            {status === 'pending' ? (
              <WhyThisStep copy={copy} layout="inline" className="mt-2" />
            ) : (
              details
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      <WhyThisStep
        copy={copy}
        layout="margin"
        className={cn(
          'hidden lg:block',
          !quiet &&
            'animate-write-in [animation-delay:90ms] [animation-duration:90ms] motion-reduce:[animation-delay:0ms]',
        )}
      />
    </li>
  );
};

export { StepSheet };
