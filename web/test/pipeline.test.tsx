import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PipelineExplorer } from '@/components/pipeline/PipelineExplorer';
import { COPY } from '@/content/copy';
import { STAGE_ORDER, STAGES } from '@/content/stages';

import { FakeEventSource } from './fake-event-source';

const config = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/config.json'), 'utf8'));

describe('pipeline view (smoke)', () => {
  beforeEach(() => {
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(config), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the pipeline shape before the first run', async () => {
    render(<PipelineExplorer />);
    await screen.findByText(COPY.settings.topK);
    for (const stage of STAGE_ORDER) {
      expect(screen.getByRole('listitem', { name: STAGES[stage].title })).toBeInTheDocument();
    }
  });

  it('renders every trace event as a step with its "Why this step?" and the cited answer', async () => {
    render(<PipelineExplorer />);
    const suggestion = await screen.findByRole('button', { name: COPY.suggestions[0] });
    await act(async () => {
      suggestion.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(FakeEventSource.lastUrl).toContain('/api/query?');
    for (const stage of STAGE_ORDER) {
      const step = screen.getByRole('listitem', { name: STAGES[stage].title });
      expect(within(step).queryByText(COPY.status.pending)).not.toBeInTheDocument();
      expect(within(step).getAllByText(COPY.why).length).toBeGreaterThan(0);
      expect(within(step).getAllByText(STAGES[stage].why).length).toBeGreaterThan(0);
    }
    const result = screen.getByRole('region', { name: COPY.resultLabel });
    expect(within(result).getByText(/Normandy/)).toBeInTheDocument();
    expect(within(result).getByText(/Total/)).toBeInTheDocument();
  });
});
