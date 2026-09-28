'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { ContextData } from '@/lib/stage-data';

type ContextViewProps = { data: ContextData; cited: Set<number> };

const ContextView = ({ data, cited }: ContextViewProps) => {
  return (
    <div className="space-y-3">
      <Typography variant="small" color="muted">
        {COPY.stageText.context(
          data.chunks.length,
          COPY.stageText.rankings[data.ranking],
          data.context_tokens_approx.toLocaleString('en'),
        )}
      </Typography>
      <ol className="border-t border-dashed">
        {data.chunks.map((chunk) => (
          <li
            key={chunk.chunk_id}
            id={`chunk-${chunk.chunk_id}`}
            className="scroll-mt-24 border-b border-dashed py-2 target:bg-accent"
          >
            <Collapsible>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm">
                  <span className="voice-data mr-2 text-primary">[{chunk.rank}]</span>
                  {chunk.doc_title}{' '}
                  <span className="voice-data text-xs text-muted-foreground">
                    #{chunk.chunk_id} · ~{chunk.approx_tokens} tok
                    {cited.has(chunk.chunk_id) ? ' · cited' : ''}
                  </span>
                </p>
                <CollapsibleTrigger className="group voice-pencil min-h-8 cursor-pointer text-sm text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid">
                  <span className="group-data-[state=open]:hidden">{COPY.showPassage}</span>
                  <span className="hidden group-data-[state=open]:inline">{COPY.hidePassage}</span>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <Typography variant="small" className="mt-2 max-w-[68ch]">
                  {chunk.text}
                </Typography>
              </CollapsibleContent>
            </Collapsible>
          </li>
        ))}
      </ol>
    </div>
  );
};

export { ContextView };
