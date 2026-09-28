'use client';

import { Code } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { type Snippet, sourceUrl } from '@/lib/snippets';

type CodeSnippetProps = {
  snippets: Snippet[];
};

// The source that produced this step, extracted from the Python files at build time.
const CodeSnippet = ({ snippets }: CodeSnippetProps) => {
  if (snippets.length === 0) return null;
  return (
    <Collapsible data-slot="code-snippet">
      <CollapsibleTrigger className="group voice-pencil inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-[15px] text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid">
        <Code aria-hidden className="size-4" />
        <span className="group-data-[state=open]:hidden">{COPY.showCode(snippets.length)}</span>
        <span className="hidden group-data-[state=open]:inline">{COPY.hideCode}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        {snippets.map((snippet) => (
          <figure key={`${snippet.file}:${snippet.startLine}`} className="min-w-0">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-dashed pb-1">
              <Typography variant="small" as="span">
                {snippet.title}
              </Typography>
              <a
                href={sourceUrl(snippet)}
                className="voice-data text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                {snippet.file.replace('api/src/', '')}:{snippet.startLine}–{snippet.endLine}
              </a>
            </figcaption>
            <pre className="voice-data overflow-x-auto py-2 text-xs leading-relaxed">
              <code
                className="hljs language-python"
                // Pre-highlighted by highlight.js at build time from our own source files.
                dangerouslySetInnerHTML={{ __html: snippet.html }}
              />
            </pre>
          </figure>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export { CodeSnippet };
