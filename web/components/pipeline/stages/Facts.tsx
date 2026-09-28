import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type Fact = { term: string; value: ReactNode; mono?: boolean };

type FactsProps = {
  facts: Fact[];
  className?: string;
};

// Key/value pairs laid out like entries on a calculation sheet.
const Facts = ({ facts, className }: FactsProps) => {
  return (
    <dl
      data-slot="facts"
      className={cn('grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm', className)}
    >
      {facts.map((fact) => (
        <div key={fact.term} className="contents">
          <dt className="text-muted-foreground">{fact.term}</dt>
          <dd className={cn('min-w-0 break-words', fact.mono !== false && 'voice-data')}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export { Facts };
