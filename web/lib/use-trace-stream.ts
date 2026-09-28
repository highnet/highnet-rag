'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiUrl } from '@/lib/api';
import type { AnswerDelta, RunDone, TraceEvent } from '@/lib/generated/trace';

export type RunStatus = 'idle' | 'running' | 'finished' | 'failed';

export type RunInput = {
  q: string;
  // A recorded question: the API replays its run instead of answering live.
  questionId?: string;
  k: number;
  chunkSet: string;
  mode: string;
  rerank: boolean;
  agentic: boolean;
};

export type TraceState = {
  status: RunStatus;
  input: RunInput | null;
  events: TraceEvent[];
  answer: string;
  done: RunDone | null;
  connectionError: string | null;
};

const initialState: TraceState = {
  status: 'idle',
  input: null,
  events: [],
  answer: '',
  done: null,
  connectionError: null,
};

const parse = <T>(event: Event) => JSON.parse((event as MessageEvent<string>).data) as T;

// One EventSource per run: trace events arrive per stage, answer text as deltas, then done.
export const useTraceStream = () => {
  const sourceRef = useRef<EventSource | null>(null);
  const [state, setState] = useState<TraceState>(initialState);

  const close = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
  }, []);

  const run = useCallback(
    (input: RunInput) => {
      close();
      setState({ ...initialState, status: 'running', input });
      const params = new URLSearchParams({
        ...(input.questionId ? { question_id: input.questionId } : { q: input.q }),
        k: String(input.k),
        chunk_set: input.chunkSet,
        mode: input.mode,
        rerank: String(input.rerank),
        agentic: String(input.agentic),
      });
      const source = new EventSource(apiUrl(`/api/query?${params.toString()}`));
      sourceRef.current = source;

      source.addEventListener('trace', (event) => {
        const trace = parse<TraceEvent>(event);
        setState((s) => ({
          ...s,
          events: [...s.events, trace].sort((a, b) => a.seq - b.seq),
        }));
      });
      source.addEventListener('answer_delta', (event) => {
        const delta = parse<AnswerDelta>(event);
        setState((s) => ({ ...s, answer: s.answer + delta.text }));
      });
      source.addEventListener('done', (event) => {
        const done = parse<RunDone>(event);
        close();
        setState((s) => ({ ...s, done, status: done.status === 'error' ? 'failed' : 'finished' }));
      });
      source.onerror = () => {
        close();
        setState((s) =>
          s.status === 'running'
            ? {
                ...s,
                status: 'failed',
                connectionError: 'The connection to the API closed before the run finished.',
              }
            : s,
        );
      };
    },
    [close],
  );

  const cancel = useCallback(() => {
    close();
    setState((s) =>
      s.status === 'running'
        ? { ...s, status: 'failed', connectionError: 'You stopped this run.' }
        : s,
    );
  }, [close]);

  useEffect(() => close, [close]);

  return { ...state, run, cancel };
};
