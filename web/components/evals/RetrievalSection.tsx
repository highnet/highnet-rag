'use client';

import { useState, useSyncExternalStore } from 'react';
import { ChevronRight } from 'lucide-react';

import { Bar } from '@/components/pipeline/figures/Bar';
import { SeriesMarker, type Series } from '@/components/pipeline/stages/RankBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Typography } from '@/components/ui/Typography';
import { EVALS } from '@/content/evals';
import {
  distinct,
  findConfig,
  type Highlight,
  metricValue,
  parseHighlight,
  RETRIEVAL_METRICS,
  type RetrievalMetric,
} from '@/lib/evals';
import { formatUsd } from '@/lib/format';
import type { RetrievalConfig, RetrievalResults } from '@/lib/generated/evals';
import { cn } from '@/lib/utils';

import { EvalSection } from './EvalSection';

const R = EVALS.retrieval;

// The query string is read once on the client; the static HTML renders without a highlight.
const noSubscription = () => () => {};
const readSearch = () => window.location.search;
const noSearch = () => '';
const SERIES: Record<string, Series> = { bm25: 'bm25', vector: 'vector', hybrid: 'fused' };

// On phones "recall" is heard but not shown, so the five options fit a 320px screen.
const metricLabel = (metric: RetrievalMetric) =>
  metric === 'mrr' ? (
    R.metric(metric)
  ) : (
    <>
      <span className="sr-only sm:not-sr-only">{R.metricPrefix}</span>@{metric}
    </>
  );

const formatMetric = (metric: RetrievalMetric, value: number) =>
  metric === 'mrr' ? value.toFixed(2) : EVALS.percent(value);

const isHighlight = (config: RetrievalConfig, highlight: Highlight | null) =>
  highlight !== null &&
  config.mode === highlight.mode &&
  config.chunk_set === highlight.chunkSet &&
  config.rerank === highlight.rerank;

type MetricCellProps = {
  config: RetrievalConfig | undefined;
  metric: RetrievalMetric;
  rerank: boolean;
  highlight: Highlight | null;
};

const MetricCell = ({ config, metric, rerank, highlight }: MetricCellProps) => {
  if (!config) return <td className="py-2 text-muted-foreground">–</td>;
  const value = metricValue(config, metric);
  const mine = isHighlight(config, highlight);
  return (
    <td className={cn('py-2 pr-3 align-middle last:pr-0', mine && 'bg-accent')}>
      <span className="sr-only">
        {R.cellLabel(
          R.metric(metric),
          formatMetric(metric, value),
          config.questions,
          config.errors,
        )}
      </span>
      <div aria-hidden className="flex items-center gap-2">
        <Bar
          segments={[{ key: 'v', value, tone: rerank ? 'rerank' : 'ink' }]}
          max={1}
          size="sm"
          className="min-w-10"
        />
        <span className="voice-data w-10 shrink-0 text-right text-sm">
          {formatMetric(metric, value)}
        </span>
      </div>
      {mine && <span className="voice-pencil mt-0.5 block text-xs text-primary">{R.yours}</span>}
    </td>
  );
};

type RetrievalSectionProps = {
  retrieval: RetrievalResults;
};

// recall@k and MRR for every configuration: one small table per chunk size, the search modes
// down the side, the reranker off and on across. A link from the pipeline lights up its row.
const RetrievalSection = ({ retrieval }: RetrievalSectionProps) => {
  const [metric, setMetric] = useState<RetrievalMetric>('5');
  const search = useSyncExternalStore(noSubscription, readSearch, noSearch);
  const highlight = parseHighlight(search);

  const { configs } = retrieval;
  const chunkSets = distinct(configs.map((c) => c.chunk_set));
  const modes = distinct(configs.map((c) => c.mode));
  const unmatched = Object.entries(retrieval.unmatched).filter(([, n]) => n > 0);

  return (
    <EvalSection id="retrieval" title={R.title} notes={[R.note(retrieval.questions), R.mrrNote]}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Typography variant="label" color="muted" id="retrieval-metric">
          {R.metricLabel}
        </Typography>
        <SegmentedControl
          name="retrieval-metric"
          labelledBy="retrieval-metric"
          size="sm"
          options={RETRIEVAL_METRICS.map((m) => ({ value: m, label: metricLabel(m) }))}
          value={metric}
          onChange={(value) => setMetric(value as RetrievalMetric)}
        />
      </div>

      <div className="mt-4 grid max-w-xl gap-y-5">
        {chunkSets.map((chunkSet) => (
          <table key={chunkSet} className="w-full border-collapse text-sm">
            <caption className="pb-1 text-left font-semibold">
              {R.chunkCaption(chunkSet, null)}
            </caption>
            <thead>
              <tr className="border-b text-left">
                <th
                  scope="col"
                  className="voice-data py-1 pr-2 text-xs font-medium text-muted-foreground"
                >
                  {R.columns.mode}
                </th>
                <th
                  scope="col"
                  className="voice-data py-1 pr-3 text-xs font-medium text-muted-foreground"
                >
                  {R.columns.off}
                </th>
                <th
                  scope="col"
                  className="voice-data py-1 text-xs font-medium text-muted-foreground"
                >
                  {R.columns.on}
                </th>
              </tr>
            </thead>
            <tbody>
              {modes.map((mode) => (
                <tr key={mode} className="border-b border-dashed last:border-b-0">
                  <th scope="row" className="py-2 pr-2 text-left font-normal whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <SeriesMarker series={SERIES[mode] ?? 'fused'} />
                      {R.mode(mode)}
                    </span>
                  </th>
                  {[false, true].map((rerank) => (
                    <MetricCell
                      key={String(rerank)}
                      config={findConfig(configs, mode, chunkSet, rerank)}
                      metric={metric}
                      rerank={rerank}
                      highlight={highlight}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>

      {unmatched.length > 0 && (
        <div className="mt-3 space-y-0.5">
          {unmatched.map(([set, n]) => (
            <Typography key={set} variant="small" color="muted">
              {R.unmatched(n, set)}
            </Typography>
          ))}
        </div>
      )}

      <Collapsible className="mt-4 border-t border-dashed pt-2">
        <CollapsibleTrigger className="group voice-pencil inline-flex min-h-10 cursor-pointer items-center gap-1 text-left text-sm text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid">
          <ChevronRight
            aria-hidden
            className="size-3.5 transition-transform group-data-[state=open]:rotate-90"
          />
          {R.tableToggle}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 overflow-x-auto">
            <table className="voice-data w-full min-w-xl border-collapse text-sm">
              <caption className="sr-only">{R.tableCaption}</caption>
              <thead>
                <tr className="border-b text-right text-xs text-muted-foreground">
                  <th scope="col" className="py-1 pr-3 text-left font-medium">
                    {R.tableHeads.config}
                  </th>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    {R.tableHeads.questions}
                  </th>
                  {retrieval.ks.map((k) => (
                    <th key={k} scope="col" className="py-1 pr-3 font-medium">
                      {R.metric(String(k))}
                    </th>
                  ))}
                  <th scope="col" className="py-1 pr-3 font-medium">
                    {R.tableHeads.mrr}
                  </th>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    {R.tableHeads.ms}
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    {R.tableHeads.cost}
                  </th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => (
                  <tr
                    key={`${c.mode}-${c.chunk_set}-${c.rerank}`}
                    className={cn(
                      'border-b border-dashed text-right last:border-b-0',
                      isHighlight(c, highlight) && 'bg-accent',
                    )}
                  >
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal whitespace-nowrap">
                      {R.configName(c.mode, c.chunk_set, c.rerank)}
                    </th>
                    <td className="py-1.5 pr-3">{c.questions}</td>
                    {retrieval.ks.map((k) => (
                      <td key={k} className="py-1.5 pr-3">
                        {EVALS.percent(c.recall[String(k)])}
                      </td>
                    ))}
                    <td className="py-1.5 pr-3">{c.mrr.toFixed(2)}</td>
                    <td className="py-1.5 pr-3">{Math.round(c.mean_ms)} ms</td>
                    <td className="py-1.5">{formatUsd(c.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Typography variant="small" color="muted" className="mt-2">
            {R.timeNote}
          </Typography>
        </CollapsibleContent>
      </Collapsible>
    </EvalSection>
  );
};

export { RetrievalSection };
