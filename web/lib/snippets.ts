import type { Stage } from '@/lib/generated/trace';
import generated from '@/lib/generated/snippets.json';

// Code excerpts are extracted from the Python source at build time (scripts/gen-snippets.mjs).
export type Snippet = {
  title: string;
  file: string;
  startLine: number;
  endLine: number;
  code: string;
  html: string;
};

const SNIPPETS = generated as Partial<Record<Stage, Snippet[]>>;

export const REPO_URL = 'https://github.com/highnet/highnet-rag';

export const snippetsFor = (stage: Stage): Snippet[] => SNIPPETS[stage] ?? [];

export const sourceUrl = (snippet: Snippet) =>
  `${REPO_URL}/blob/main/${snippet.file}#L${snippet.startLine}-L${snippet.endLine}`;
