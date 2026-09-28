'use client';

import { ChevronRight } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { StageCopy } from '@/content/stages';
import { cn } from '@/lib/utils';

type WhyThisStepProps = {
  copy: StageCopy;
  layout: 'inline' | 'margin';
  className?: string;
};

// The blue-pencil note for each step: a plain-language paragraph first, the technical layer on
// demand.
const WhyThisStep = ({ copy, layout, className }: WhyThisStepProps) => {
  const details = (
    <Collapsible>
      <CollapsibleTrigger className="group voice-pencil inline-flex cursor-pointer items-center gap-1 text-sm text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid">
        <ChevronRight
          aria-hidden
          className="size-3.5 transition-transform group-data-[state=open]:rotate-90"
        />
        {COPY.underTheHood}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Typography variant="small" color="muted" className="mt-2">
          {copy.detail}
        </Typography>
      </CollapsibleContent>
    </Collapsible>
  );

  if (layout === 'margin') {
    return (
      <aside data-slot="why-this-step" className={cn('space-y-2 pt-5', className)}>
        <Typography variant="label" color="pencil" as="p">
          {COPY.why}
        </Typography>
        <Typography variant="marginNote">{copy.why}</Typography>
        {details}
      </aside>
    );
  }

  // Inside the sheet (below lg) the note opens the step, always visible, before the figure.
  return (
    <div data-slot="why-this-step" className={cn('space-y-1', className)}>
      <Typography variant="marginNote" className="max-w-[68ch]">
        {copy.why}
      </Typography>
      {details}
    </div>
  );
};

export { WhyThisStep };
