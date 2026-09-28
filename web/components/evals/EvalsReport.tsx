import { Notice } from '@/components/site/Notice';
import { Typography } from '@/components/ui/Typography';
import { EVALS } from '@/content/evals';
import { formatUsd } from '@/lib/format';
import type { HighnetRagEvalResults } from '@/lib/generated/evals';

import { AnswersSection } from './AnswersSection';
import { CompoundSection } from './CompoundSection';
import { RetrievalSection } from './RetrievalSection';
import { RunCostSection } from './RunCostSection';

const F = EVALS.runFacts;

// The models that answered and graded are listed only when the run called them.
// The run record names every model the run actually called, straight from its cost lines.
const facts = (results: HighnetRagEvalResults): [string, string][] => [
  [F.date, results.run.started_at.slice(0, 10)],
  [F.corpus, results.run.corpus_build_id],
  [F.models, results.cost.by_model.map((line) => line.model).join(', ')],
  [F.cost, `${formatUsd(results.cost.total_usd)}, ${F.costNote}`],
];

type EvalsReportProps = {
  results: HighnetRagEvalResults | null;
};

// Sheet 2: the offline eval run, rendered only from evals/results/latest.json.
const EvalsReport = ({ results }: EvalsReportProps) => {
  const questions = results?.golden.reduce((n, set) => n + set.questions, 0) ?? 0;
  const compound = results?.golden.find((set) => set.name === 'compound')?.questions ?? 0;
  return (
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-4">
        <Typography variant="sheetTitle" id="sheet-title">
          <span className="voice-data mr-3 align-[0.2em] text-sm font-normal tracking-normal text-muted-foreground">
            {EVALS.sheetLabel} ·
          </span>
          {EVALS.title}
        </Typography>
        {results ? (
          <>
            <Typography color="muted" className="max-w-[68ch]">
              {results.answers
                ? EVALS.lede(questions, true)
                : EVALS.lede(results.retrieval.questions, false)}
            </Typography>
            <dl className="voice-data flex flex-wrap gap-x-6 gap-y-2 border-y border-dashed py-3 text-sm">
              {facts(results).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {results.run.illustrative && <Notice tone="note">{EVALS.illustrative}</Notice>}
          </>
        ) : (
          <Notice tone="note">
            <p className="font-semibold">{EVALS.empty.title}</p>
            <p>{EVALS.empty.body}</p>
          </Notice>
        )}
      </header>

      {results && (
        <>
          <RetrievalSection retrieval={results.retrieval} />
          <AnswersSection answers={results.answers ?? null} />
          <CompoundSection compound={results.compound ?? null} questions={compound} />
          <RunCostSection results={results} />
        </>
      )}
    </div>
  );
};

export { EvalsReport };
