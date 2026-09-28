// Extracts `# snippet: <stages> | <title>` ... `# /snippet` regions from the Python pipeline
// and pre-highlights them with highlight.js. The page shows exactly the code that runs:
// the source files are the single source of truth; lib/generated/snippets.json is derived.
// Run: npm run gen:snippets (CI fails if the committed output is stale).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';

hljs.registerLanguage('python', python);

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const sourceRoot = path.join(repoRoot, 'api/src/highnet_rag');
const outFile = path.join(here, '../lib/generated/snippets.json');

// A web-only checkout (no api/) keeps the committed snippets.json; CI regenerates and diffs it.
if (!existsSync(sourceRoot)) {
  console.log(`No ${path.relative(repoRoot, sourceRoot)}; keeping the committed snippets.json`);
  process.exit(0);
}

const START = /^\s*# snippet: ([\w,]+) \| (.+)$/;
const END = /^\s*# \/snippet\s*$/;

const pythonFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pythonFiles(full);
    return entry.name.endsWith('.py') ? [full] : [];
  });

const dedent = (lines) => {
  const indents = lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length);
  const cut = Math.min(...indents);
  return lines.map((l) => l.slice(cut));
};

const trimBlank = (lines, offset) => {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start += 1;
  while (end > start && !lines[end - 1].trim()) end -= 1;
  return { lines: lines.slice(start, end), startLine: offset + start };
};

const extract = (file) => {
  const rel = path.relative(repoRoot, file).split(path.sep).join('/');
  const lines = readFileSync(file, 'utf8').split('\n');
  const found = [];
  let open = null;
  lines.forEach((line, i) => {
    const start = line.match(START);
    if (start) {
      if (open) throw new Error(`${rel}:${i + 1}: nested snippet`);
      open = { stages: start[1].split(','), title: start[2].trim(), from: i + 1 };
      return;
    }
    if (END.test(line)) {
      if (!open) throw new Error(`${rel}:${i + 1}: /snippet without a start`);
      const body = trimBlank(lines.slice(open.from, i), open.from + 1);
      const code = dedent(body.lines).join('\n');
      const snippet = {
        title: open.title,
        file: rel,
        startLine: body.startLine,
        endLine: body.startLine + body.lines.length - 1,
        code,
        html: hljs.highlight(code, { language: 'python' }).value,
      };
      open.stages.forEach((stage) => found.push({ stage, snippet }));
      open = null;
    }
  });
  if (open) throw new Error(`${rel}:${open.from}: snippet is never closed`);
  return found;
};

// The stage's own pipeline code comes first, then the helpers it calls.
const rank = (file) => (file.endsWith('pipeline/classic.py') ? 0 : 1);
const snippets = {};
for (const { stage, snippet } of pythonFiles(sourceRoot).flatMap(extract)) {
  (snippets[stage] ??= []).push(snippet);
}
for (const list of Object.values(snippets)) {
  list.sort((a, b) => rank(a.file) - rank(b.file) || a.file.localeCompare(b.file));
}
const sorted = Object.fromEntries(Object.entries(snippets).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(outFile, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `Wrote ${path.relative(process.cwd(), outFile)} (${Object.keys(sorted).length} stages)`,
);
