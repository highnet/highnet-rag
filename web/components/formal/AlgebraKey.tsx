import { ChevronRight } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { FORMAL, KEY, type KeyEntry } from '@/content/formal';

import { Formula, glyph } from './Formula';

const GROUPS: KeyEntry['group'][] = ['table', 'operator', 'function', 'value'];

type AlgebraKeyProps = {
  agentic: boolean;
};

// The building blocks the step formulas are made of, and the whole run as one line. Folded by
// default, so the diagram stays short on a phone.
const AlgebraKey = ({ agentic }: AlgebraKeyProps) => {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group voice-pencil inline-flex min-h-10 cursor-pointer items-center gap-1 text-left text-sm text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid">
        <ChevronRight
          aria-hidden
          className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90"
        />
        {FORMAL.title}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        <Typography variant="small" color="muted" className="max-w-[68ch]">
          {FORMAL.intro}
        </Typography>
        {GROUPS.map((group) => (
          <div key={group}>
            <Typography variant="label" color="muted" as="h2">
              {FORMAL.groups[group]}
            </Typography>
            <dl className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(KEY)
                .filter(([, entry]) => entry.group === group)
                .map(([symbol, entry]) => (
                  <div
                    key={symbol}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2 rounded-sm border bg-card px-2.5 py-1.5 text-xs"
                  >
                    <dt className="voice-data min-w-6 text-sm whitespace-nowrap text-primary">
                      {glyph(symbol)}
                    </dt>
                    <dd>
                      <span className="font-semibold">{entry.name}</span>
                      <span className="text-muted-foreground">: {entry.meaning}</span>
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
        <div>
          <Typography variant="label" color="muted" as="h2">
            {FORMAL.whole}
          </Typography>
          <Formula
            id="whole-run"
            source={agentic ? FORMAL.wholeAgent : FORMAL.wholeClassic}
            className="mt-1"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export { AlgebraKey };
