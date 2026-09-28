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

// The blue-pencil note beside each step: plain language first, the technical layer on demand.
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

  return (
    <Collapsible data-slot="why-this-step" className={cn('border-t border-dashed pt-3', className)}>
      <CollapsibleTrigger className="group voice-pencil inline-flex min-h-10 cursor-pointer items-center gap-1 text-[15px] text-primary">
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform group-data-[state=open]:rotate-90"
        />
        {COPY.why}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pb-1">
        <Typography variant="marginNote">{copy.why}</Typography>
        {details}
      </CollapsibleContent>
    </Collapsible>
  );
};

export { WhyThisStep };
