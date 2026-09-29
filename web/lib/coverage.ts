import report from '@/lib/generated/coverage.json';

export type Counts = { covered: number; total: number };
export type FileCoverage = { path: string; lines: Counts; branches: Counts };
export type PackageCoverage = {
  name: string;
  root: string;
  totals: { lines: Counts; branches: Counts };
  empty_files: number;
  files: FileCoverage[];
};
export type SuiteCoverage = { runner: string; tests: number; packages: PackageCoverage[] };
export type CoverageReport = { python: SuiteCoverage | null; web: SuiteCoverage | null };

// Written by scripts/coverage_report.py from the test runs; CI fails if it no longer matches.
export const committedCoverage = report as CoverageReport;

// A share is never rounded up: 99.96% reads "99.9%", so only a full count reads "100%".
export const coveragePercent = ({ covered, total }: Counts): string | null => {
  if (total === 0) return null;
  if (covered === total) return '100%';
  return `${(Math.floor((covered / total) * 1000) / 10).toFixed(1)}%`;
};

export const isComplete = ({ lines, branches }: { lines: Counts; branches: Counts }): boolean =>
  lines.covered === lines.total && branches.covered === branches.total;
