import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CoveragePage from '@/app/coverage/page';
import { CoverageReport } from '@/components/coverage/CoverageReport';
import { COPY } from '@/content/copy';
import { COVERAGE } from '@/content/coverage';
import {
  type CoverageReport as Report,
  type PackageCoverage,
  committedCoverage,
  coveragePercent,
} from '@/lib/coverage';

const pkg = (name: string, overrides: Partial<PackageCoverage> = {}): PackageCoverage => ({
  name,
  root: `${name}/src`,
  totals: { lines: { covered: 10, total: 10 }, branches: { covered: 4, total: 4 } },
  empty_files: 0,
  files: [
    { path: 'app.py', lines: { covered: 6, total: 6 }, branches: { covered: 4, total: 4 } },
    { path: 'config.py', lines: { covered: 4, total: 4 }, branches: { covered: 0, total: 0 } },
  ],
  ...overrides,
});

const complete: Report = {
  python: { runner: 'pytest + coverage.py', tests: 117, packages: [pkg('api'), pkg('evals')] },
  web: { runner: 'Vitest + V8', tests: 124, packages: [pkg('web', { empty_files: 2 })] },
};

describe('coverage page', () => {
  it('renders every package with its totals, its files and the test counts', () => {
    render(<CoverageReport report={complete} />);
    expect(screen.getByText(COVERAGE.facts.testsValue(117, 124))).toBeInTheDocument();
    for (const name of ['api', 'evals', 'web']) {
      expect(
        screen.getByRole('heading', { name: COVERAGE.packages[name].title }),
      ).toBeInTheDocument();
    }
    expect(screen.getAllByText('100%')).toHaveLength(6);
    expect(screen.queryByText(COVERAGE.below)).not.toBeInTheDocument();
    // The per-file table opens from its fold; a file without branches reads as a dash.
    const web = screen.getByRole('region', { name: COVERAGE.packages.web.title });
    fireEvent.click(within(web).getByRole('button', { name: COVERAGE.filesToggle(2) }));
    const table = within(web).getByRole('table', {
      name: COVERAGE.filesCaption(COVERAGE.packages.web.title),
    });
    expect(within(table).getByRole('rowheader', { name: 'config.py' })).toBeInTheDocument();
    expect(within(table).getByText('–')).toBeInTheDocument();
    expect(within(web).getByText(COVERAGE.empty(2))).toBeInTheDocument();
  });

  it('marks anything short of 100%, and never rounds it up', () => {
    const short = pkg('api', {
      totals: { lines: { covered: 9999, total: 10000 }, branches: { covered: 0, total: 0 } },
      empty_files: 1,
      files: [
        { path: 'app.py', lines: { covered: 1, total: 3 }, branches: { covered: 0, total: 0 } },
      ],
    });
    render(
      <CoverageReport report={{ python: { ...complete.python!, packages: [short] }, web: null }} />,
    );
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText(COVERAGE.noBranches)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COVERAGE.filesToggle(1) }));
    expect(screen.getAllByText(COVERAGE.below)).toHaveLength(2);
    expect(screen.getByText(COVERAGE.empty(1))).toBeInTheDocument();
    // A suite with no report says so instead of showing zeros.
    expect(screen.getByText(COVERAGE.missing.title)).toBeInTheDocument();
    expect(screen.getByText(COVERAGE.facts.testsValue(117, 0))).toBeInTheDocument();
  });

  it('says so when neither suite has a report', () => {
    render(<CoverageReport report={{ python: null, web: null }} />);
    expect(screen.getAllByText(COVERAGE.missing.title)).toHaveLength(2);
  });

  it('computes shares without rounding up', () => {
    expect(coveragePercent({ covered: 0, total: 0 })).toBeNull();
    expect(coveragePercent({ covered: 5, total: 5 })).toBe('100%');
    expect(coveragePercent({ covered: 1, total: 3 })).toBe('33.3%');
  });

  it('renders the committed report as a page', () => {
    render(<CoveragePage />);
    expect(
      within(screen.getByRole('navigation', { name: COPY.nav.label })).getByRole('link', {
        name: 'Coverage',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(committedCoverage.python?.packages.map((p) => p.name)).toEqual(['api', 'evals']);
  });
});
