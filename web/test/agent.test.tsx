import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PipelineExplorer } from '@/components/pipeline/PipelineExplorer';
import { StepList } from '@/components/pipeline/StepList';
import { COPY } from '@/content/copy';
import { AGENT_STAGE_ORDER, STAGES } from '@/content/stages';
import type { TraceEvent } from '@/lib/generated/trace';

import { ControlledEventSource, ev } from './helpers';

const A = COPY.figures.agent;
const config = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/config.json'), 'utf8'));
const recorded = readFileSync(path.join(__dirname, 'fixtures/agent.sse'), 'utf8')
  .trim()
  .split('\n\n')
  .filter((block) => !block.startsWith(':'))
  .map((block) => {
    const [name, data] = block.split('\n');
    return [name.replace('event: ', ''), JSON.parse(data.replace('data: ', ''))] as const;
  });

const withConfig = (overrides: Record<string, unknown> = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ ...config, ...overrides }))),
  );

beforeEach(() => {
  ControlledEventSource.instances = [];
  vi.stubGlobal('EventSource', ControlledEventSource);
});
afterEach(() => vi.unstubAllGlobals());

const context = { chunks: new Map(), cited: new Set<number>(), streamedAnswer: '' };

describe('agentic mode', () => {
  it('offers the compound questions, runs the agent and shows each search nested', async () => {
    withConfig();
    render(<PipelineExplorer />);
    await screen.findByText(COPY.settings.topK);
    fireEvent.click(screen.getAllByRole('radio', { name: 'on' })[1]);
    expect(window.location.search).toContain('agent=1');
    expect(screen.getByText(COPY.agentTryLabel)).toBeInTheDocument();
    expect(screen.getByText(COPY.workingNote(AGENT_STAGE_ORDER.length))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COPY.agentSuggestions[0] }));
    const source = ControlledEventSource.last();
    expect(source.url).toContain('agentic=true');
    // Before any search has come back the agent sheet is running.
    act(() => recorded.slice(0, 2).forEach(([name, data]) => source.emit(name, data)));
    const sheet = screen.getByRole('listitem', { name: STAGES.agent_step.title });
    expect(within(sheet).getByText(COPY.status.running)).toBeInTheDocument();
    // Mid-search it is still running, with the first search already listed.
    act(() => recorded.slice(2, 4).forEach(([name, data]) => source.emit(name, data)));
    expect(within(sheet).getAllByText(COPY.status.running).length).toBeGreaterThan(0);
    act(() => recorded.slice(4).forEach(([name, data]) => source.emit(name, data)));
    expect(screen.getByText(A.queries)).toBeInTheDocument();
    expect(within(sheet).getByText('3a')).toBeInTheDocument();
    expect(within(sheet).getAllByText('Harvard University').length).toBeGreaterThan(0);
    expect(within(sheet).getByText(A.answered(8))).toBeInTheDocument();
    fireEvent.click(within(sheet).getAllByText(A.showStages(5))[0]);
    expect(within(sheet).getByText('3a.1')).toBeInTheDocument();
    fireEvent.click(screen.getByText(A.instructions));
    expect(screen.getByText(/You gather evidence/)).toBeInTheDocument();
  });

  it('is paused, and says so, once the budget passes its 80% mark', async () => {
    withConfig({ budget: { spent_usd: 17, cap_usd: 20, remaining_usd: 3, tier: 'degraded' } });
    window.history.replaceState(null, '', '/?agent=1');
    render(<PipelineExplorer />);
    await screen.findByText(COPY.settings.agentDescription.paused);
    expect(screen.getAllByRole('radio', { name: 'on' })[1]).toBeDisabled();
    expect(screen.getByText(COPY.tryLabel)).toBeInTheDocument();
  });

  it('sums up the searches on the folded phone row', () => {
    globalThis.__wide = false;
    const events = [
      ev('request', { reason: 'x' }, 'skipped'),
      { ...ev('agent_step', { tool: 'search', input: { query: 'q' } }), label: '3a' },
      { ...ev('agent_step', { tool: 'answer', input: {}, found: 4 }), label: '3b' },
    ];
    render(
      <StepList order={AGENT_STAGE_ORDER} events={events} runStatus="finished" context={context} />,
    );
    expect(screen.getByText(COPY.summary.searched(1, 4))).toBeInTheDocument();
  });

  it('marks stops, bad calls and tool-less turns, and fails loudly on errors', () => {
    const step = (
      label: string,
      data: Record<string, unknown>,
      status: TraceEvent['status'] = 'ok',
    ) => ({
      ...ev('agent_step', data, status),
      label,
    });
    const events = [
      ev('request', { reason: 'x' }, 'skipped'),
      step('3a', { tool: 'lookup', input: {}, error: { message: 'Unknown tool.' } }, 'warning'),
      step('3a', { tool: 'none', input: {}, note: 'Hmm.' }),
      step('3a', { tool: 'answer', input: {} }),
      step('3a', { tool: 'stop', input: {}, stopped: 'Reached the limit.' }, 'warning'),
    ];
    const { rerender } = render(
      <StepList order={AGENT_STAGE_ORDER} events={events} runStatus="finished" context={context} />,
    );
    const sheet = screen.getByRole('listitem', { name: STAGES.agent_step.title });
    expect(within(sheet).getByText('Unknown tool.')).toBeInTheDocument();
    expect(within(sheet).getByText(A.noTool)).toBeInTheDocument();
    expect(within(sheet).getByText(A.answered(0))).toBeInTheDocument();
    expect(A.answered(1)).toBe('Enough evidence: answered from the 1 passage found.');
    expect(within(sheet).getByText(/Reached the limit\./)).toBeInTheDocument();
    expect(within(sheet).getAllByText(COPY.status.warning).length).toBeGreaterThan(0);
    rerender(
      <StepList
        order={AGENT_STAGE_ORDER}
        events={[...events, step('3b', { tool: 'search', input: { query: 'x' } }, 'error')]}
        runStatus="finished"
        context={context}
      />,
    );
    expect(within(sheet).getAllByText(COPY.status.error).length).toBeGreaterThan(0);
    rerender(
      <StepList
        order={AGENT_STAGE_ORDER}
        events={[ev('request', { reason: 'x' }, 'skipped')]}
        runStatus="finished"
        context={context}
      />,
    );
    expect(within(sheet).getByText(COPY.status.pending)).toBeInTheDocument();
  });
});
