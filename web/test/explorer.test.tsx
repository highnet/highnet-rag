import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PipelineExplorer } from '@/components/pipeline/PipelineExplorer';
import { COPY } from '@/content/copy';
import { useMediaQuery } from '@/lib/use-media-query';
import { useTraceStream } from '@/lib/use-trace-stream';

import { ControlledEventSource, ev } from './helpers';

const baseConfig = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/config.json'), 'utf8'));

const withConfig = (overrides: Record<string, unknown> = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ ...baseConfig, ...overrides }))),
  );

beforeEach(() => {
  ControlledEventSource.instances = [];
  vi.stubGlobal('EventSource', ControlledEventSource);
});

afterEach(() => vi.unstubAllGlobals());

describe('explorer states', () => {
  it('explains a failed connection and retries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 502 })),
    );
    render(<PipelineExplorer />);
    expect(await screen.findByText(/The API answered 502/)).toBeInTheDocument();
    withConfig();
    fireEvent.click(screen.getByRole('button', { name: COPY.retry }));
    expect(screen.getByText(COPY.starting)).toBeInTheDocument();
    expect(await screen.findByText(COPY.settings.topK)).toBeInTheDocument();
  });

  it('reports non-Error failures too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject('offline')),
    );
    render(<PipelineExplorer />);
    expect(await screen.findByText(/offline/)).toBeInTheDocument();
  });

  it('warns when the budget is degraded and stops questions when it is spent', async () => {
    withConfig({
      illustrative: false,
      budget: { spent_usd: 17, cap_usd: 20, remaining_usd: 3, tier: 'degraded' },
    });
    const { unmount } = render(<PipelineExplorer />);
    expect(await screen.findByText(/\$17\.00 of this month’s \$20\.00/)).toBeInTheDocument();
    expect(screen.queryByText(COPY.illustrative)).not.toBeInTheDocument();
    unmount();
    withConfig({ budget: { spent_usd: 20, cap_usd: 20, remaining_usd: 0, tier: 'stopped' } });
    render(<PipelineExplorer />);
    expect(await screen.findByText(/used up/)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.questionLabel)).toBeDisabled();
  });

  it('runs a typed question, adjusts top-k, announces steps and can be stopped', async () => {
    withConfig();
    render(<PipelineExplorer />);
    await screen.findByText(COPY.settings.topK);
    fireEvent.click(screen.getByRole('button', { name: COPY.settings.more }));
    fireEvent.click(screen.getByRole('button', { name: COPY.settings.fewer }));
    fireEvent.click(screen.getByRole('button', { name: COPY.settings.fewer }));
    fireEvent.submit(screen.getByRole('search'));
    expect(ControlledEventSource.instances).toHaveLength(0); // empty question is ignored
    fireEvent.change(screen.getByLabelText(COPY.questionLabel), { target: { value: ' Why? ' } });
    fireEvent.submit(screen.getByRole('search'));
    const source = ControlledEventSource.last();
    expect(source.url).toContain('q=Why%3F');
    expect(source.url).toContain('k=4');
    act(() => source.emit('trace', ev('request', { reason: 'x' }, 'skipped')));
    expect(
      screen.getByText(/Step \d+, Check the request: skipped in 1\.20 s\./),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COPY.stop }));
    expect(source.closed).toBe(true);
    expect(screen.getByText('You stopped this run.')).toBeInTheDocument();
  });

  it('ignores questions until the API has answered', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    render(<PipelineExplorer />);
    fireEvent.change(screen.getByLabelText(COPY.questionLabel), { target: { value: 'Why?' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(ControlledEventSource.instances).toHaveLength(0);
  });

  it('drops the config request when unmounted', async () => {
    let reject: (reason: unknown) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise((_, r) => (reject = r))),
    );
    const { unmount } = render(<PipelineExplorer />);
    unmount();
    reject(new DOMException('aborted', 'AbortError'));
    await Promise.resolve();
    expect(screen.queryByText(COPY.offline)).not.toBeInTheDocument();
  });

  it('shows the chunk set only when the corpus has it', async () => {
    withConfig({ chunk_sets: [] });
    render(<PipelineExplorer />);
    await screen.findByText(COPY.settings.topK);
    expect(screen.queryByText(COPY.settings.chunks)).not.toBeInTheDocument();
  });
});

describe('useTraceStream', () => {
  const input = { q: 'q', k: 3, chunkSet: 'medium', mode: 'vector' };

  it('collects events in order, streams text and finishes', () => {
    const { result } = renderHook(() => useTraceStream());
    act(() => result.current.run(input));
    const source = ControlledEventSource.last();
    const second = ev('embed_query', {});
    const first = { ...ev('request', {}), seq: second.seq - 1 };
    act(() => {
      source.emit('trace', second);
      source.emit('trace', first);
      source.emit('answer_delta', { run_id: 'run', text: 'Fr' });
      source.emit('answer_delta', { run_id: 'run', text: 'ance' });
    });
    expect(result.current.events.map((e) => e.stage)).toEqual(['request', 'embed_query']);
    expect(result.current.answer).toBe('France');
    act(() =>
      source.emit('done', {
        run_id: 'run',
        status: 'error',
        ms: 1,
        tokens: 0,
        cost_usd: 0,
        stages: 2,
      }),
    );
    expect(result.current.status).toBe('failed');
    act(() => source.fail()); // a late error after done changes nothing
    expect(result.current.connectionError).toBeNull();
    act(() => result.current.cancel()); // nothing running: no-op
    expect(result.current.connectionError).toBeNull();
  });

  it('reports a dropped connection while running', () => {
    const { result } = renderHook(() => useTraceStream());
    act(() => result.current.run(input));
    act(() => ControlledEventSource.last().fail());
    expect(result.current.status).toBe('failed');
    expect(result.current.connectionError).toMatch(/closed before the run finished/);
  });
});

describe('useMediaQuery', () => {
  it('follows the media query and unsubscribes', () => {
    const remove = vi.fn();
    window.matchMedia = ((query: string) => ({
      matches: query.includes('768'),
      addEventListener: vi.fn(),
      removeEventListener: remove,
    })) as unknown as typeof window.matchMedia;
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});

describe('page', () => {
  it('assembles header, explorer and footer', async () => {
    withConfig();
    const { default: Page } = await import('@/app/page');
    render(<Page />);
    expect(await screen.findByText(COPY.settings.topK)).toBeInTheDocument();
    expect(screen.getByText(COPY.footer.corpus)).toBeInTheDocument();
  });
});
