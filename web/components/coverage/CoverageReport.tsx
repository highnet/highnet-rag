import { ChevronRight, TriangleAlert } from 'lucide-react';

import { EvalSection } from '@/components/evals/EvalSection';
import { Bar } from '@/components/pipeline/figures/Bar';
import { Notice } from '@/components/site/Notice';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { COVERAGE } from '@/content/coverage';
import {
  type Counts,
  type CoverageReport as Report,
  type PackageCoverage,
  type SuiteCoverage,
  coveragePercent,
  isComplete,
} from '@/lib/coverage';
import { cn } from '@/lib/utils';

type BelowMarkProps = { className?: string };

// Short of 100% is a warning glyph plus words, never colour alone.
const BelowMark = ({ className }: BelowMarkProps) => {
  return (
    <span
      className={cn('voice-data inline-flex items-center gap-1 text-xs text-warning', className)}
    >
      <TriangleAlert aria-hidden className="size-3.5" />
      {COVERAGE.below}
    </span>
  );
};

type TotalProps = {
  label: string;
  counts: Counts;
};

// One total: the share with its counts, and a bar on a 0–100% scale.
const Total = ({ label, counts }: TotalProps) => {
  const percent = coveragePercent(counts);
  return (
    <div className="space-y-1">
      <dt className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span>{label}</span>
        <span className="voice-data">
          <span className="font-semibold">{percent ?? COVERAGE.noBranches}</span>
          {percent && (
            <span className="ml-2 text-muted-foreground">
              {COVERAGE.ofCount(counts.covered, counts.total)}
            </span>
          )}
        </span>
      </dt>
      <dd>
        <Bar
          segments={[
            { key: 'v', value: counts.total ? counts.covered / counts.total : 0, tone: 'ink' },
          ]}
          max={1}
          size="sm"
        />
      </dd>
    </div>
  );
};

type CellProps = { counts: Counts };

const Cell = ({ counts }: CellProps) => {
  return (
    <td className="py-1.5 pl-3 text-right whitespace-nowrap">
      {counts.total ? (
        COVERAGE.ofCount(counts.covered, counts.total)
      ) : (
        <span className="text-muted-foreground">–</span>
      )}
    </td>
  );
};

type PackageSheetProps = {
  pkg: PackageCoverage;
  suite: SuiteCoverage;
};

const PackageSheet = ({ pkg, suite }: PackageSheetProps) => {
  const copy = COVERAGE.packages[pkg.name];
  return (
    <EvalSection id={pkg.name} title={copy.title} notes={[copy.note]}>
      <p className="voice-data -mt-2 text-xs text-muted-foreground">
        {pkg.root} · {COVERAGE.measuredBy(suite.runner)}
      </p>
      <dl className="mt-4 grid max-w-xl gap-y-3">
        <Total label={COVERAGE.lines} counts={pkg.totals.lines} />
        <Total label={COVERAGE.branches} counts={pkg.totals.branches} />
      </dl>
      {!isComplete(pkg.totals) && <BelowMark className="mt-3" />}

      <Collapsible className="mt-4 border-t border-dashed pt-2">
        <CollapsibleTrigger className="group voice-pencil inline-flex min-h-10 cursor-pointer items-center gap-1 text-left text-sm text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid">
          <ChevronRight
            aria-hidden
            className="size-3.5 transition-transform group-data-[state=open]:rotate-90"
          />
          {COVERAGE.filesToggle(pkg.files.length)}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <table className="voice-data mt-2 w-full border-collapse text-sm">
            <caption className="sr-only">{COVERAGE.filesCaption(copy.title)}</caption>
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th scope="col" className="py-1 text-left font-medium">
                  {COVERAGE.heads.file}
                </th>
                <th scope="col" className="py-1 pl-3 text-right font-medium">
                  {COVERAGE.heads.lines}
                </th>
                <th scope="col" className="py-1 pl-3 text-right font-medium">
                  {COVERAGE.heads.branches}
                </th>
              </tr>
            </thead>
            <tbody>
              {pkg.files.map((file) => (
                <tr
                  key={file.path}
                  className="border-b border-dashed align-baseline last:border-b-0"
                >
                  <th scope="row" className="py-1.5 text-left font-normal [overflow-wrap:anywhere]">
                    {file.path}
                    {!isComplete(file) && <BelowMark className="ml-2" />}
                  </th>
                  <Cell counts={file.lines} />
                  <Cell counts={file.branches} />
                </tr>
              ))}
            </tbody>
          </table>
          {pkg.empty_files > 0 && (
            <Typography variant="small" color="muted" className="mt-2">
              {COVERAGE.empty(pkg.empty_files)}
            </Typography>
          )}
        </CollapsibleContent>
      </Collapsible>
    </EvalSection>
  );
};

type SuiteSectionsProps = { suite: SuiteCoverage | null; name: string };

const SuiteSections = ({ suite, name }: SuiteSectionsProps) => {
  if (!suite) {
    return (
      <Notice tone="note">
        <p className="font-semibold">{COVERAGE.missing.title}</p>
        <p>
          {name}: {COVERAGE.missing.body}
        </p>
      </Notice>
    );
  }
  return suite.packages.map((pkg) => <PackageSheet key={pkg.name} pkg={pkg} suite={suite} />);
};

type CoverageReportProps = {
  report: Report;
};

// Sheet 4: how much of the code the tests run, rendered only from the committed report.
const CoverageReport = ({ report }: CoverageReportProps) => {
  const facts: [string, string][] = [
    [
      COVERAGE.facts.tests,
      COVERAGE.facts.testsValue(report.python?.tests ?? 0, report.web?.tests ?? 0),
    ],
    [COVERAGE.facts.rule, COVERAGE.facts.ruleValue],
    [COVERAGE.facts.checked, COVERAGE.facts.checkedValue],
  ];
  return (
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-4">
        <Typography variant="sheetTitle" id="sheet-title">
          <span className="voice-data mr-3 align-[0.2em] text-sm font-normal tracking-normal text-muted-foreground">
            {COVERAGE.sheetLabel} ·
          </span>
          {COVERAGE.title}
        </Typography>
        <Typography color="muted" className="max-w-[68ch]">
          {COVERAGE.lede}
        </Typography>
        <dl className="voice-data flex flex-wrap gap-x-6 gap-y-2 border-y border-dashed py-3 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </header>
      <SuiteSections suite={report.python} name="Python" />
      <SuiteSections suite={report.web} name="Web" />
    </div>
  );
};

export { CoverageReport };
