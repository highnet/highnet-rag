import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PipelineDiagram } from '@/components/pipeline/PipelineDiagram';
import type { StepStatus } from '@/components/pipeline/StatusMark';
import { COPY } from '@/content/copy';
import { AGENT_STAGE_ORDER, STAGE_ORDER, STAGES } from '@/content/stages';
import type { Stage } from '@/lib/generated/trace';

const statuses: Partial<Record<Stage, StepStatus>> = {
  request: 'ok',
  embed_query: 'error',
  bm25: 'running',
  rerank: 'skipped',
};
const statusOf = (stage: Stage) => statuses[stage] ?? 'pending';

describe('pipeline diagram', () => {
  it('draws every step in order, linked to its sheet, with BM25 and vector side by side', () => {
    render(<PipelineDiagram order={STAGE_ORDER} statusOf={statusOf} />);
    const bm25 = screen.getByRole('link', { name: /Keyword search/ });
    expect(bm25).toHaveAttribute('href', '#step-bm25');
    expect(bm25).toHaveAttribute('data-status', 'running');
    expect(bm25.parentElement).toContainElement(
      screen.getByRole('link', { name: /Vector search/ }),
    );
    expect(screen.getByRole('link', { name: /Embed the question/ })).toHaveAttribute(
      'data-status',
      'error',
    );
    expect(screen.getAllByRole('link')).toHaveLength(STAGE_ORDER.length);
    expect(screen.getByText(COPY.diagram.offlineSteps[0])).toBeInTheDocument();
    // Below lg the corpus build folds behind a pencil toggle, so the question's steps come first.
    fireEvent.click(screen.getByRole('button', { name: COPY.diagram.offline }));
    expect(screen.getAllByText(COPY.diagram.offlineSteps[0])).toHaveLength(2);
    expect(screen.getByText(COPY.diagram.agentOff)).toBeInTheDocument();
  });

  it('shows the agent path when the agent is on', () => {
    render(<PipelineDiagram order={AGENT_STAGE_ORDER} statusOf={statusOf} />);
    expect(
      screen.getByRole('link', { name: new RegExp(STAGES.agent_plan.title) }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.diagram.agentOn)).toBeInTheDocument();
  });
});
