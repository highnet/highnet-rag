'use client';

import { Fragment, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { Bm25Data, FuseData, VectorData } from '@/lib/stage-data';
import { cn } from '@/lib/utils';

import { RankBadge } from './RankBadge';
import { RankTable } from './RankTable';

type FuseViewProps = { data: FuseData; bm25?: Bm25Data; vector?: VectorData };

const formatContribution = (value: number | undefined) =>
  value === undefined ? '0' : value.toFixed(4);

// The two input rankings side by side (folded, then stacked, below lg: the steps just above
// already show them), then the fused list with each passage's rank in both inputs and the
// top-k cut. Candidates below the cut stay folded until asked for, to keep the step short.
const FuseView = ({ data, bm25, vector }: FuseViewProps) => {
  const T = COPY.stageText;
  const [showDropped, setShowDropped] = useState(false);
  const dropped = Math.max(data.results.length - data.kept, 0);
  const rows = showDropped ? data.results : data.results.slice(0, data.kept);
  return (
    <div className="space-y-4">
      {bm25 && vector && (
        <Collapsible>
          <CollapsibleTrigger className="group voice-pencil flex min-h-8 cursor-pointer items-center gap-1 text-sm text-primary lg:hidden">
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-data-[state=open]:rotate-180"
            />
            <span className="underline decoration-dotted underline-offset-4">{T.showInputs}</span>
          </CollapsibleTrigger>
          <CollapsibleContent
            forceMount
            className="mt-2 grid gap-4 data-[state=closed]:hidden lg:mt-0 lg:grid-cols-2 lg:gap-6 lg:data-[state=closed]:grid"
          >
            <div className="min-w-0 space-y-1">
              <Typography variant="label" color="muted" as="h4">
                {T.inputBm25}
              </Typography>
              <RankTable
                compact
                caption="BM25 ranking, input to fusion"
                series="bm25"
                valueLabel="score"
                rows={bm25.results.map((r) => ({ ...r, value: r.score.toFixed(2) }))}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <Typography variant="label" color="muted" as="h4">
                {T.inputVector}
              </Typography>
              <RankTable
                compact
                caption="Vector ranking, input to fusion"
                series="vector"
                valueLabel="distance"
                rows={vector.results.map((r) => ({ ...r, value: r.distance.toFixed(4) }))}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="space-y-1">
        <Typography variant="label" color="muted" as="h4">
          {T.fused(data.k)}
        </Typography>
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{T.fusedCaption}</caption>
          <thead>
            <tr className="voice-data border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="w-12 py-1.5 pr-3 font-medium">
                rank
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                passage
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                from
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                rrf
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const dropped = row.rank > data.kept;
              return (
                <Fragment key={row.chunk_id}>
                  {row.rank === data.kept + 1 && (
                    <tr aria-hidden>
                      <td colSpan={4} className="border-t border-primary pt-1 pb-0.5">
                        <Typography variant="marginNote" as="span" className="text-sm">
                          {T.cut(data.kept)}
                        </Typography>
                      </td>
                    </tr>
                  )}
                  <tr
                    className={cn(
                      'border-b border-dashed last:border-b-0',
                      dropped && 'text-muted-foreground',
                    )}
                  >
                    <td className="py-2 pr-3">
                      <RankBadge series="fused" rank={row.rank} />
                    </td>
                    <td className="py-2 pr-3">
                      {row.doc_title}{' '}
                      <span className="voice-data text-xs text-muted-foreground">
                        #{row.chunk_id}
                        {dropped && <span className="sr-only">, {T.droppedNote}</span>}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="flex flex-wrap gap-x-3 gap-y-1">
                        <RankBadge series="bm25" rank={row.from.bm25_rank} />
                        <RankBadge series="vector" rank={row.from.vector_rank} />
                      </span>
                    </td>
                    <td className="voice-data py-2 text-right whitespace-nowrap">
                      {row.score.toFixed(4)}
                      <span className="block text-xs text-muted-foreground">
                        {T.contributions(
                          formatContribution(row.contributions.bm25),
                          formatContribution(row.contributions.vector),
                        )}
                      </span>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {dropped > 0 && (
          <Button
            variant="pencil"
            size="inline"
            aria-expanded={showDropped}
            className="mt-2 min-h-8"
            onClick={() => setShowDropped((open) => !open)}
          >
            {showDropped ? T.hideDropped : T.showDropped(dropped)}
          </Button>
        )}
      </div>
    </div>
  );
};

export { FuseView };
