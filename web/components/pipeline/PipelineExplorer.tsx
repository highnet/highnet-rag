'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Notice } from '@/components/site/Notice';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { AGENT_STAGE_ORDER, STAGE_ORDER, STAGES } from '@/content/stages';
import { type ApiConfig, type DemoQuestion, fetchConfig } from '@/lib/api';
import { runEvalsHref } from '@/lib/evals';
import { formatMs, formatUsd } from '@/lib/format';
import type { TraceEvent } from '@/lib/generated/trace';
import type {
  Bm25Data,
  CitationsData,
  ContextChunk,
  ContextData,
  RequestData,
  VectorData,
} from '@/lib/stage-data';
import { stepStatuses } from '@/lib/step-status';
import { useTraceStream } from '@/lib/use-trace-stream';
import { parseUrlState, type RunSettings, writeUrlState } from '@/lib/url-state';

import { AnswerResult } from './AnswerResult';
import { PipelineDiagram } from './PipelineDiagram';
import { QuestionForm } from './QuestionForm';
import { QuestionPicker } from './QuestionPicker';
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
          if (!q) return;
          if (config.live) {
            if (config.budget.tier !== 'stopped') run({ q, ...linkedSettings });
            return;
          }
          // A replay costs nothing, so the budget never blocks it; the link names the question.
          const picked = config.questions.find((x) => x.question === q);
          if (picked) {
            run({
              q,
              questionId: picked.id,
              ...linkedSettings,
              agentic: linkedSettings.agentic && picked.compound,
            });
          }
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
    // Top-level steps only: an agent's nested searches have their own bm25 and vector events.
    const byStage = new Map(trace.events.filter((e) => !e.parent).map((e) => [e.stage, e]));
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
      chunkSet: (byStage.get('request')?.data as RequestData | undefined)?.settings?.chunk_set,
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
  // Replay: visitors pick a recorded question and see its recorded run for their settings.
  const replay = config !== null && !config.live;
  const shownQuestion = trace.input?.q ?? linkedQuestion;
  const selected = replay
    ? (config.questions.find((x) => x.question === shownQuestion) ?? null)
    : null;
  // The agent runs live only while the budget allows, and was recorded for compound questions.
  const agentPause = replay
    ? selected?.compound
      ? null
      : { reason: COPY.replay.agentNeedsCompound, warning: false }
    : tier === 'normal'
      ? null
      : { reason: COPY.settings.agentDescription.paused, warning: true };
  // The steps drawn follow the run on screen, or the settings before the first run.
  const agentOn = settings?.agentic === true && agentPause === null;
  const agentView = trace.input ? trace.input.agentic : agentOn;
  const order = agentView ? AGENT_STAGE_ORDER : STAGE_ORDER;

  const runQuestion = (q: string) => {
    if (!settings) return; // the form is disabled until the API has answered
    writeUrlState({ q, ...settings });
    // A paused agent is not asked for: the run on screen is the one the server will do.
    run({ q, ...settings, agentic: settings.agentic && tier === 'normal' });
  };

  const replayQuestion = (question: DemoQuestion, next: RunSettings) => {
    writeUrlState({ q: question.question, ...next });
    run({
      q: question.question,
      questionId: question.id,
      ...next,
      agentic: next.agentic && question.compound,
    });
  };

  const changeSettings = (next: RunSettings) => {
    setSettings(next);
    writeUrlState({ q: trace.input?.q ?? '', ...next });
    // A recorded run exists for every setting, so a change replays at once.
    if (selected) replayQuestion(selected, next);
  };

  const ran = trace.input;
  const stale =
    !replay &&
    ran !== null &&
    settings !== null &&
    (ran.mode !== settings.mode ||
      ran.k !== settings.k ||
      ran.chunkSet !== settings.chunkSet ||
      ran.rerank !== settings.rerank ||
      ran.agentic !== settings.agentic);

  return (
    <div className="space-y-8 md:space-y-10">
      <section aria-labelledby="sheet-title" className="space-y-4 md:space-y-5">
        <Typography color="muted" className="max-w-[68ch]">
          {replay ? COPY.replay.intro : COPY.intro}
        </Typography>
        <PipelineDiagram order={order} statusOf={stepStatuses(order, trace.events, trace.status)} />
        <Typography variant="sheetTitle" id="sheet-title">
          <span className="voice-data mr-3 align-[0.2em] text-sm font-normal tracking-normal text-muted-foreground">
            {COPY.sheetLabel} ·
          </span>
          {trace.input?.q ?? COPY.emptyTitle}
        </Typography>

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
        {replay && (
          <Notice tone="note">
            {config.recorded.at
              ? COPY.replay.notice(config.recorded.at.slice(0, 10))
              : COPY.replay.noticeUndated}
          </Notice>
        )}
        {!replay && tier === 'degraded' && config && (
          <Notice tone="warning">
            {COPY.budgetDegraded(
              formatUsd(config.budget.spent_usd),
              formatUsd(config.budget.cap_usd),
            )}
          </Notice>
        )}
        {!replay && tier === 'stopped' && config && (
          <Notice tone="error">{COPY.budgetStopped(formatUsd(config.budget.cap_usd))}</Notice>
        )}

        {replay ? (
          <QuestionPicker
            questions={config.questions}
            selectedId={selected?.id ?? null}
            running={running}
            onPick={(question) => settings && replayQuestion(question, settings)}
            onStop={trace.cancel}
          />
        ) : (
          <QuestionForm
            key={linkedQuestion}
            initialQuestion={linkedQuestion}
            running={running}
            disabled={!config || tier === 'stopped'}
            maxLength={config?.max_query_chars ?? 500}
            suggestions={agentOn ? COPY.agentSuggestions : COPY.suggestions}
            suggestionsLabel={agentOn ? COPY.agentTryLabel : COPY.tryLabel}
            lastNote={agentOn ? undefined : COPY.suggestionNote}
            onRun={runQuestion}
            onStop={trace.cancel}
          />
        )}
        {config && settings && (
          <SettingsStrip
            config={config}
            settings={settings}
            disabled={running}
            stale={stale && !running}
            agentPause={agentPause}
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
            {COPY.workingNote(order.length)}
          </Typography>
        </div>
        <StepList order={order} events={trace.events} runStatus={trace.status} context={context} />
      </section>

      {context.citations && (
        <AnswerResult
          citations={context.citations}
          done={trace.done}
          evalsHref={runEvalsHref(trace.input)}
        />
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
};

export { PipelineExplorer };
