---
version: 1
slug: 'web-app-coverage-page-tsx'
primary_target: 'web/app/coverage/page.tsx'
related_targets: []
---

# Surface: test coverage audit (`/coverage`)

Scope: Sheet 4 of the pad. Shows how much of the code the test suites run: per package (API, eval runner, website) and per file, lines and branches. Visitor mode: **Read**, with an Operate layer (the per-file fold).

- Audience and job: recruiters and developers checking that the project is tested as claimed. The job is to trust "100% coverage" because every count is visible.
- Action: read the totals; open a package's files to audit any one file.
- Proof and content: `web/lib/generated/coverage.json`, written by `scripts/coverage_report.py` from real pytest and Vitest runs; CI rewrites it from its own run and fails on any difference. Owner decision (2026-09-29): "Committed, CI-checked".
- Constraints: every number real; nothing rounded up; shortfalls shown with a mark and words, never colour alone; mobile-first, no horizontal scroll at 320px.

## Direction contract

THESIS: The coverage report is a sheet on the same computation pad, not a CI badge: the counts are the evidence.

OWN-WORLD: As DESIGN.md. Reuses the evals report's sheet-with-margin-note, bars and dashed record.

FIRST VIEWPORT: "Sheet 4 · Is every line tested?", the lede, the record (tests, rule, checked), then the first package sheet with its totals.
