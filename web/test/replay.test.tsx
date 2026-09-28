import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PipelineExplorer } from '@/components/pipeline/PipelineExplorer';
import { COPY } from '@/content/copy';
import type { DemoQuestion } from '@/lib/api';

import { ControlledEventSource, ev } from './helpers';

const R = COPY.replay;
const base = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/config.json'), 'utf8'));
const single: DemoQuestion = { id: 'normandy', question: 'Where is Normandy?', compound: false };
const compound: DemoQuestion = { id: 'two', question: 'Where and who?', compound: true };

const withConfig = (overrides: Record<string, unknown> = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ...base,
            live: false,
            questions: [single, compound],
            recorded: { ks: [3, 5, 10], at: '2026-09-28T21:00:00+00:00' },
            ...overrides,
          }),
        ),
    ),
  );

const url = () => new URL(ControlledEventSource.last().url, 'http://x');

beforeEach(() => {
  ControlledEventSource.instances = [];
  vi.stubGlobal('EventSource', ControlledEventSource);
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('replayed questions', () => {
  it('offers the recorded questions instead of a text box and says runs are replays', async () => {
    withConfig({ budget: { ...base.budget, tier: 'stopped' } });
    render(<PipelineExplorer />);
    expect(await screen.findByText(R.notice('2026-09-28'))).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // Replays cost nothing, so a spent budget neither warns nor blocks.
    expect(screen.queryByText(/used up/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: R.single })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: R.compound })).toBeInTheDocument();
    expect(screen.getByText(R.agentNeedsCompound)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: single.question }));
    expect(url().searchParams.get('question_id')).toBe('normandy');
    expect(url().searchParams.has('q')).toBe(false);
    expect(screen.getByRole('button', { name: single.question })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // A running replay can be stopped.
    fireEvent.click(screen.getByRole('button', { name: COPY.stop }));
    expect(ControlledEventSource.last().closed).toBe(true);
  });

  it('replays at once when a setting changes, stepping top-k through the recorded values', async () => {
    withConfig();
    render(<PipelineExplorer />);
    fireEvent.click(await screen.findByRole('button', { name: compound.question }));
    const source = ControlledEventSource.last();
    act(() => {
      source.emit(
        'trace',
        ev('request', {
          ...base,
          settings: { q: compound.question, mode: 'hybrid', k: 5, chunk_set: 'medium' },
          models: { embed: { model: 'e' }, answer: { model: 'a' } },
          rate_limit: { remaining_minute: 1, remaining_day: 1, limit_minute: 2, limit_day: 2 },
          budget: {
            spent_usd: 0,
            cap_usd: 20,
            remaining_usd: 20,
            degrade_at_usd: 16,
            tier: 'normal',
          },
          recording: { recorded_at: '2026-09-28T21:00:00+00:00', note: 'Replayed.' },
        }),
      );
      source.emit('done', {
        run_id: 'run',
        status: 'ok',
        ms: 1,
        tokens: 0,
        cost_usd: 0,
        stages: 1,
      });
    });
    expect(screen.getByText(`${R.recorded('2026-09-28')} Replayed.`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COPY.settings.fewer }));
    expect(url().searchParams.get('k')).toBe('3');
    expect(screen.getByRole('button', { name: COPY.settings.fewer })).toBeDisabled();
    act(() => ControlledEventSource.last().emit('done', { status: 'ok' }));
    // The agent is allowed for a compound question, and the change replays with it on.
    fireEvent.click(screen.getAllByRole('radio', { name: 'on' })[1]);
    expect(url().searchParams.get('agentic')).toBe('true');
    expect(screen.queryByText(COPY.settings.changed)).not.toBeInTheDocument();
  });

  it('runs a linked recorded question, and ignores a link to anything else', async () => {
    withConfig();
    window.history.replaceState(
      null,
      '',
      `/?q=${encodeURIComponent(compound.question)}&agent=1&k=10`,
    );
    const { unmount } = render(<PipelineExplorer />);
    await screen.findByText(R.notice('2026-09-28'));
    expect(url().searchParams.get('question_id')).toBe('two');
    expect(url().searchParams.get('agentic')).toBe('true');
    expect(url().searchParams.get('k')).toBe('10');
    unmount();
    ControlledEventSource.instances = [];
    window.history.replaceState(null, '', '/?q=Something%20else&agent=1');
    render(<PipelineExplorer />);
    await screen.findByText(R.notice('2026-09-28'));
    expect(ControlledEventSource.instances).toHaveLength(0);
  });

  it('says when nothing is recorded, and folds long lists', async () => {
    withConfig({ questions: [], recorded: { ks: [3, 5, 10], at: null } });
    const { unmount } = render(<PipelineExplorer />);
    expect(await screen.findByText(R.empty)).toBeInTheDocument();
    expect(screen.getByText(R.noticeUndated)).toBeInTheDocument();
    unmount();
    const many = Array.from({ length: 6 }, (_, i) => ({
      id: `q${i}`,
      question: `Question ${i}?`,
      compound: false,
    }));
    withConfig({ questions: many });
    render(<PipelineExplorer />);
    await screen.findByRole('button', { name: 'Question 0?' });
    expect(screen.queryByRole('button', { name: 'Question 5?' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: R.more(3) }));
    expect(screen.getByText(R.intro)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Question 5?' }));
    act(() => ControlledEventSource.last().emit('done', { status: 'ok' }));
    // With a folded question selected, the group stays open and has no toggle.
    const group = screen.getByRole('heading', { name: R.single }).parentElement!;
    expect(within(group).queryByText(R.fewer)).not.toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Question 5?' })).toBeInTheDocument();
  });
});
