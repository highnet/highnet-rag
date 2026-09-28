import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PipelineExplorer } from '@/components/pipeline/PipelineExplorer';
import { COPY } from '@/content/copy';
import { EVALS } from '@/content/evals';

import { FakeEventSource } from './fake-event-source';

const config = readFileSync(path.join(__dirname, 'fixtures/config.json'), 'utf8');
const corpusMap = readFileSync(path.join(__dirname, 'fixtures/map.json'), 'utf8');

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource);
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) => new Response(url.includes('/api/corpus/map') ? corpusMap : config),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('the link from an answer to the evals', () => {
  it('carries the run settings', async () => {
    render(<PipelineExplorer />);
    const suggestion = await screen.findByRole('button', { name: COPY.suggestions[0] });
    await act(async () => {
      suggestion.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const link = await screen.findByRole('link', { name: EVALS.fromPipeline });
    expect(link.getAttribute('href')).toMatch(/^\/evals\/\?mode=\w+&chunks=\w+/);
  });
});
