import { EVALS } from '@/content/evals';
import { formatMs, formatTokens, formatUsd } from '@/lib/format';
import type { CompoundResults, Rate } from '@/lib/generated/evals';

import { EvalSection } from './EvalSection';
import { NotMeasured } from './NotMeasured';

const C = EVALS.compound;

const rate = (r: Rate) => `${EVALS.percent(r.value)} (${EVALS.ofCount(r.count, r.of)})`;

type CompoundSectionProps = {
  compound: CompoundResults[] | null;
  questions: number;
};

// The cross-article questions, one search against the agent, measure by measure.
const CompoundSection = ({ compound, questions }: CompoundSectionProps) => {
  const classic = compound?.find((c) => c.pipeline === 'classic');
  const agentic = compound?.find((c) => c.pipeline === 'agentic');
  const notes = [C.note(questions)];
  if (!classic || !agentic) {
    return (
      <EvalSection id="compound" title={C.title} notes={notes}>
        <NotMeasured />
      </EvalSection>
    );
  }
  const rows: [string, (c: CompoundResults) => string][] = [
    [C.allFound, (c) => rate(c.all_articles_found)],
    [C.coverage, (c) => EVALS.percent(c.article_coverage)],
    [C.correct, (c) => rate(c.correct)],
    [C.abstained, (c) => rate(c.abstained)],
    [C.searches, (c) => c.mean_searches.toFixed(1)],
    [C.tokens, (c) => formatTokens(c.mean_tokens)],
    [C.time, (c) => formatMs(Math.round(c.mean_ms))],
    [C.cost, (c) => formatUsd(c.mean_cost_usd)],
  ];
  return (
    <EvalSection id="compound" title={C.title} notes={notes}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="voice-data border-b text-xs text-muted-foreground">
              <th scope="col" className="py-1 pr-3 text-left font-medium">
                {C.columns.measure}
              </th>
              <th scope="col" className="py-1 pr-3 text-right font-medium">
                {C.columns.classic}
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                {C.columns.agentic}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-dashed last:border-b-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {label}
                </th>
                <td className="voice-data py-2 pr-3 text-right">{value(classic)}</td>
                <td className="voice-data py-2 text-right">{value(agentic)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EvalSection>
  );
};

export { CompoundSection };
