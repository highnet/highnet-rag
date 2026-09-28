import { Typography } from '@/components/ui/Typography';
import { EVALS } from '@/content/evals';
import type { AnswerResults } from '@/lib/generated/evals';

import { EvalSection } from './EvalSection';
import { Measure, MeasureList } from './Measure';
import { NotMeasured } from './NotMeasured';

const A = EVALS.answers;

type AnswersSectionProps = {
  answers: AnswerResults | null;
};

// End-to-end answers at the default settings: was the evidence sent, was the answer right,
// did it stay within the passages, and did it decline when it should.
const AnswersSection = ({ answers }: AnswersSectionProps) => {
  if (!answers) {
    return (
      <EvalSection id="answers" title={A.title} notes={[A.note]}>
        <NotMeasured />
      </EvalSection>
    );
  }
  const { config, answerable: yes, unanswerable: no } = answers;
  return (
    <EvalSection id="answers" title={A.title} notes={[A.note]}>
      <Typography variant="small" color="muted">
        {A.config(config.mode, config.chunk_set, config.k, config.rerank)}
      </Typography>
      <div className="mt-4 grid gap-x-8 gap-y-6 md:grid-cols-2">
        <div>
          <Typography variant="label" color="muted" as="h3">
            {A.answerable(yes.questions)}
          </Typography>
          <MeasureList className="mt-2">
            <Measure label={A.evidence} rate={yes.evidence_in_context} tone="fused" />
            <Measure label={A.correct} rate={yes.correct} />
            <Measure label={A.correctWithEvidence} rate={yes.correct_with_evidence} />
            <Measure label={A.abstainedWrongly} rate={yes.abstained} tone="neutral" />
            <Measure label={A.faithfulness} value={yes.faithfulness} tone="rerank" />
            <Measure label={A.fullySupported} rate={yes.fully_supported} tone="rerank" />
          </MeasureList>
        </div>
        <div>
          <Typography variant="label" color="muted" as="h3">
            {A.unanswerable(no.questions)}
          </Typography>
          <MeasureList className="mt-2">
            <Measure label={A.abstainedRightly} rate={no.abstained} />
            <Measure label={A.faithfulnessGiven} value={no.faithfulness} tone="rerank" />
          </MeasureList>
        </div>
      </div>
      <Typography variant="marginNote" className="mt-5">
        {A.takeaway}
      </Typography>
    </EvalSection>
  );
};

export { AnswersSection };
