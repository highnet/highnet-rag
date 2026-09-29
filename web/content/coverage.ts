// English copy for the /coverage page. Every number is passed in from the committed report.

const count = (n: number) => n.toLocaleString('en');

export const COVERAGE = {
  sheetLabel: 'Sheet 4',
  title: 'Is every line tested?',
  metaTitle: 'Test coverage of every file',
  metaDescription:
    'Line and branch coverage for every file of highnet-rag (the API, the eval runner and the website), measured by the test suites and checked by CI on every change.',
  lede: 'Every line and every branch of the API, the eval runner and this website runs under a test, and CI rejects a change that drops below 100%. Comments that hide code from the count are not allowed. The numbers below are the committed test run; CI runs the tests again on every change and fails if they no longer match.',
  facts: {
    tests: 'Tests',
    testsValue: (python: number, web: number) => `${count(python)} Python · ${count(web)} web`,
    rule: 'Rule',
    ruleValue: '100% of lines and branches',
    checked: 'Checked',
    checkedValue: 'by CI on every push, against a fresh run',
  },
  packages: {
    api: {
      title: 'The API',
      note: 'The FastAPI app, every pipeline stage, the providers, the storage and the recorder. Tests swap Claude and Voyage for fakes, so no test calls a paid API.',
    },
    evals: {
      title: 'The eval runner',
      note: 'The golden sets, the runner and its judge, tested the same way with fake models.',
    },
    web: {
      title: 'This website',
      note: 'Every page, component and helper, rendered in a simulated browser. Generated files (trace types, code excerpts) and stylesheets are not counted.',
    },
  } as Record<string, { title: string; note: string }>,
  measuredBy: (runner: string) => `measured by ${runner}`,
  lines: 'Lines',
  branches: 'Branches',
  ofCount: (covered: number, total: number) => `${count(covered)} of ${count(total)}`,
  noBranches: 'no branches',
  below: 'below 100%',
  filesToggle: (n: number) => `All ${count(n)} files`,
  filesCaption: (title: string) => `Coverage of each file: ${title}`,
  heads: { file: 'File', lines: 'Lines', branches: 'Branches' },
  empty: (n: number) =>
    n === 1
      ? '1 file with nothing to run (an empty module) is not listed.'
      : `${count(n)} files with nothing to run (empty modules, types only) are not listed.`,
  missing: {
    title: 'No coverage report for this suite yet.',
    body: 'Run scripts/gen-coverage.sh to measure it; until then there is nothing honest to show.',
  },
};
