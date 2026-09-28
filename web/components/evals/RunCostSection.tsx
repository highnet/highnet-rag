import { Typography } from '@/components/ui/Typography';
import { EVALS } from '@/content/evals';
import { detailsUrl } from '@/lib/evals';
import { formatUsd } from '@/lib/format';
import type { HighnetRagEvalResults } from '@/lib/generated/evals';

import { EvalSection } from './EvalSection';

const S = EVALS.sets;
const K = EVALS.cost;
const integer = new Intl.NumberFormat('en');

type RunCostSectionProps = {
  results: HighnetRagEvalResults;
};

// Where the questions came from and what the run cost, call by call, model by model.
const RunCostSection = ({ results }: RunCostSectionProps) => {
  const { golden, cost, run } = results;
  return (
    <EvalSection id="run" title={K.title} notes={[]}>
      <Typography variant="label" color="muted" as="h3">
        {S.title}
      </Typography>
      <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        {golden.map((set) => (
          <div key={set.name}>
            <dt className="voice-data font-semibold">{set.name}</dt>
            <dd className="text-muted-foreground">
              {S[set.name]}
              <br />
              <span className="voice-data">
                {set.questions
                  ? `${set.questions} · ${S.counts(set.answerable, set.unanswerable)}`
                  : S.pending}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 overflow-x-auto">
        <table className="voice-data w-full border-collapse text-sm">
          <caption className="pb-1 text-left font-sans text-xs text-muted-foreground">
            {K.caption}
          </caption>
          <thead>
            <tr className="border-b text-right text-xs text-muted-foreground">
              <th scope="col" className="py-1 pr-3 text-left font-medium">
                {K.heads.model}
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                {K.heads.calls}
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                {K.heads.input}
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                {K.heads.output}
              </th>
              <th scope="col" className="py-1 font-medium">
                {K.heads.cost}
              </th>
            </tr>
          </thead>
          <tbody>
            {cost.by_model.map((line) => (
              <tr key={line.model} className="border-b border-dashed text-right">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                  {line.model}
                </th>
                <td className="py-1.5 pr-3">{integer.format(line.calls)}</td>
                <td className="py-1.5 pr-3">{integer.format(line.input_tokens)}</td>
                <td className="py-1.5 pr-3">{integer.format(line.output_tokens)}</td>
                <td className="py-1.5">{formatUsd(line.cost_usd)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t text-right font-semibold">
              <th scope="row" colSpan={4} className="py-1.5 pr-3 text-left">
                {K.total}
              </th>
              <td className="py-1.5">{formatUsd(cost.total_usd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Per-question details exist only when answers were generated and graded. */}
      {results.answers && (
        <p className="mt-3 text-sm">
          <a
            href={detailsUrl(run.started_at)}
            className="text-primary underline underline-offset-4"
          >
            {K.details}
          </a>
        </p>
      )}
    </EvalSection>
  );
};

export { RunCostSection };
