'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Notice } from '@/components/site/Notice';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { STAGE_ORDER, STAGES } from '@/content/stages';
import { fetchConfig, type ApiConfig } from '@/lib/api';
import { formatMs, formatUsd } from '@/lib/format';
import type { TraceEvent } from '@/lib/generated/trace';
import type {
  Bm25Data,
  CitationsData,
  ContextChunk,
  ContextData,
  VectorData,
} from '@/lib/stage-data';
import { useTraceStream } from '@/lib/use-trace-stream';
import { parseUrlState, type RunSettings, writeUrlState } from '@/lib/url-state';

import { AnswerResult } from './AnswerResult';
import { QuestionForm } from './QuestionForm';
import { SettingsStrip } from './SettingsStrip';
import { StepList } from './StepList';

type ConfigState =
  | { status: 'loading' }
  | { status: 'ready'; config: ApiConfig }
  | { status: 'error'; message: string };

const PipelineExplorer = () => {
  const [configState, setConfigState] = useState<ConfigState>({ status: 'loading' });
  const [settings, setSettings] = useState<RunSettings | null>(null);
  const [linkedQuestion, setLinkedQuestion] = useState('');
  const trace = useTraceStream();
  const { run } = trace;

  // State is only set from the fetch callbacks, never synchronously inside the effect.
  // Settings come from the link when it carries valid ones; a linked question runs at once.
  const requestConfig = useCallback(
    (signal?: AbortSignal) => {
      fetchConfig(signal)
        .then((config) => {
          const linked = parseUrlState(window.location.search, config);
          const { q, ...linkedSettings } = linked;
          setConfigState({ status: 'ready', config });
          setSettings(linkedSettings);
          setLinkedQuestion(q);
          if (q && config.budget.tier !== 'stopped') run({ q, ...linkedSettings });
        })
        .catch((error: unknown) => {
          if (signal?.aborted) return;
          setConfigState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        });
    },
    [run],
  );

  useEffect(() => {
    const controller = new AbortController();
    requestConfig(controller.signal);
    return () => controller.abort();
  }, [requestConfig]);

  const retryConfig = () => {
    setConfigState({ status: 'loading' });
    requestConfig();
  };

  const context = useMemo(() => {
    const byStage = new Map(trace.events.map((e) => [e.stage, e]));
    const contextData = byStage.get('select_context')?.data as ContextData | undefined;
    const citations = byStage.get('citations')?.data as CitationsData | undefined;
    const chunks = new Map<number, ContextChunk>(
      (contextData?.chunks ?? []).map((c) => [c.chunk_id, c]),
    );
    const cited = new Set((citations?.citations ?? []).map((c) => c.chunk_id));
    // Fusion shows its two input rankings, so it needs the search steps' results too.
    const ok = (stage: string) => {
      const event = byStage.get(stage as TraceEvent['stage']);
      return event && event.status !== 'skipped' && event.status !== 'error'
        ? event.data
        : undefined;
    };
    return {
      chunks,
      cited,
      citations,
      streamedAnswer: trace.answer,
      bm25: ok('bm25') as Bm25Data | undefined,
      vector: ok('vector') as VectorData | undefined,
    };
  }, [trace.events, trace.answer]);

  const lastEvent = trace.events.at(-1);
  const announcement = lastEvent
    ? COPY.announce(
        lastEvent.label,
        STAGES[lastEvent.stage].title,
        COPY.status[lastEvent.status],
        formatMs(lastEvent.ms),
      )
    : '';

  const config = configState.status === 'ready' ? configState.config : null;
  const tier = config?.budget.tier ?? 'normal';
  const running = trace.status === 'running';

  const runQuestion = (q: string) => {
    if (!settings) return; // the form is disabled until the API has answered
    writeUrlState({ q, ...settings });
    run({ q, ...settings });
  };

  const changeSettings = (next: RunSettings) => {
    setSettings(next);
    writeUrlState({ q: trace.input?.q ?? '', ...next });
  };

  const ran = trace.input;
  const stale =
    ran !== null &&
    settings !== null &&
    (ran.mode !== settings.mode || ran.k !== settings.k || ran.chunkSet !== settings.chunkSet);

  return (
    <div className="space-y-8 md:space-y-10">
      <section aria-labelledby="sheet-title" className="space-y-4 md:space-y-5">
        <div className="space-y-2">
          <Typography variant="sheetTitle" id="sheet-title">
            <span className="voice-data mr-3 align-[0.2em] text-sm font-normal tracking-normal text-muted-foreground">
              {COPY.sheetLabel} ·
            </span>
            {trace.input?.q ?? COPY.emptyTitle}
          </Typography>
          {!trace.input && <Typography color="muted">{COPY.intro}</Typography>}
        </div>

        {configState.status === 'loading' && <Notice tone="note">{COPY.starting}</Notice>}
        {configState.status === 'error' && (
          <Notice tone="error">
            <p>
              {COPY.offline} {configState.message}
            </p>
            <Button variant="pencil" size="inline" className="mt-1" onClick={retryConfig}>
              {COPY.retry}
            </Button>
          </Notice>
        )}
        {config?.illustrative && <Notice tone="note">{COPY.illustrative}</Notice>}
        {tier === 'degraded' && config && (
          <Notice tone="warning">
            {COPY.budgetDegraded(
              formatUsd(config.budget.spent_usd),
              formatUsd(config.budget.cap_usd),
            )}
          </Notice>
        )}
        {tier === 'stopped' && config && (
          <Notice tone="error">{COPY.budgetStopped(formatUsd(config.budget.cap_usd))}</Notice>
        )}

        <QuestionForm
          key={linkedQuestion}
          initialQuestion={linkedQuestion}
          running={running}
          disabled={!config || tier === 'stopped'}
          maxLength={config?.max_query_chars ?? 500}
          onRun={runQuestion}
          onStop={trace.cancel}
        />
        {config && settings && (
          <SettingsStrip
            config={config}
            settings={settings}
            disabled={running}
            stale={stale && !running}
            onChange={changeSettings}
          />
        )}
        {trace.connectionError && <Notice tone="warning">{trace.connectionError}</Notice>}
      </section>

      <section aria-labelledby="working-title" className="space-y-3 md:space-y-4">
        <div className="flex items-baseline gap-3 border-b pb-2">
          <Typography variant="label" as="h2" id="working-title">
            {COPY.workingLabel}
          </Typography>
          <Typography variant="small" color="muted" as="span">
            {COPY.workingNote(STAGE_ORDER.length)}
          </Typography>
        </div>
        <StepList events={trace.events} runStatus={trace.status} context={context} />
      </section>

      {context.citations && <AnswerResult citations={context.citations} done={trace.done} />}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
};

export { PipelineExplorer };
