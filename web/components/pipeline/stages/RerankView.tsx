'use client';

import { type CSSProperties, Fragment, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { RerankData } from '@/lib/stage-data';
import { cn } from '@/lib/utils';

import { Bar } from '../figures/Bar';
import { RankBadge } from './RankBadge';

type RerankViewProps = { data: RerankData };

type MoveProps = { before: number; after: number };

// The rank change in words and an arrow, so it never rests on direction or colour alone.
const Move = ({ before, after }: MoveProps) => {
  const T = COPY.stageText;
  const delta = before - after;
  if (delta === 0) {
    return <span className="text-muted-foreground">–</span>;
  }
  const Icon = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-0.5">
      <Icon aria-hidden className="size-3.5" />
      {Math.abs(delta)}
      <span className="sr-only">{delta > 0 ? T.moved.up(delta) : T.moved.down(-delta)}</span>
    </span>
  );
};

// The reranked list with each passage's old rank and its move. On arrival every row slides
// from its old place to its new one; with reduced motion the list simply appears in order.
const RerankView = ({ data }: RerankViewProps) => {
  const T = COPY.stageText;
  const C = T.columns;
  const [showDropped, setShowDropped] = useState(false);
  if (data.fallback) {
    return (
      <Typography color="warning">
        {data.error?.message} {data.fallback}
      </Typography>
    );
  }
  const dropped = Math.max(data.results.length - data.kept, 0);
  const rows = showDropped ? data.results : data.results.slice(0, data.kept);
  return (
    <div className="space-y-3">
      <Typography variant="small" color="muted">
        {T.rerank(data.results.length, T.rankings[data.input] ?? data.input)}
      </Typography>
      {/* Clip rows that slide in from beyond the visible list. */}
      <div className="overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{T.series.rerank}</caption>
          <thead>
            <tr className="voice-data border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="w-12 py-1.5 pr-3 font-medium">
                {C.rank}
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                {C.passage}
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                {T.was}
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                {T.relevance}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const below = row.rank > data.kept;
              return (
                <Fragment key={row.chunk_id}>
                  <tr
                    className={cn(
                      'motion-safe:animate-settle border-b border-dashed',
                      below && 'text-muted-foreground',
                      row.rank === data.kept && 'border-b-0',
                    )}
                    style={{ '--shift': row.before_rank - row.rank } as CSSProperties}
                  >
                    <td className="py-1.5 pr-3 sm:py-2">
                      <RankBadge series="rerank" rank={row.rank} muted={below} />
                    </td>
                    <td className="py-1.5 pr-3 sm:py-2">
                      {row.doc_title}{' '}
                      <span className="voice-data block text-xs text-muted-foreground sm:inline">
                        #{row.chunk_id}
                        {below && <span className="sr-only">, {T.droppedNote}</span>}
                      </span>
                    </td>
                    <td className="voice-data py-1.5 pr-3 whitespace-nowrap sm:py-2">
                      <span className="text-muted-foreground">{row.before_rank}</span>{' '}
                      <Move before={row.before_rank} after={row.rank} />
                    </td>
                    <td className="voice-data py-1.5 text-right whitespace-nowrap sm:py-2">
                      {row.relevance.toFixed(3)}
                      <Bar
                        size="sm"
                        max={1}
                        className="my-1 ml-auto w-20"
                        segments={[
                          {
                            key: 'relevance',
                            value: row.relevance,
                            tone: below ? 'neutral' : 'rerank',
                          },
                        ]}
                      />
                    </td>
                  </tr>
                  {row.rank === data.kept && (
                    <tr>
                      <td colSpan={4} className="border-t border-primary pt-1 pb-1.5">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                          <Typography
                            variant="marginNote"
                            as="span"
                            aria-hidden
                            className="text-sm"
                          >
                            {T.cut(data.kept)}
                          </Typography>
                          {dropped > 0 && (
                            <Button
                              variant="pencil"
                              size="inline"
                              aria-expanded={showDropped}
                              className="min-h-8 gap-1 text-sm"
                              onClick={() => setShowDropped((open) => !open)}
                            >
                              <ChevronDown
                                aria-hidden
                                className={cn('transition-transform', showDropped && 'rotate-180')}
                              />
                              {showDropped ? T.hideDropped : T.showDropped(dropped)}
                            </Button>
                          )}
                        </span>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Typography variant="small" color="muted" className="max-w-[68ch]">
        {COPY.figures.rerank.caption}
      </Typography>
    </div>
  );
};

export { RerankView };
