'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { formatUsd } from '@/lib/format';
import type { PromptData } from '@/lib/stage-data';

import { Facts } from './Facts';

type PromptViewProps = { data: PromptData };

const PromptView = ({ data }: PromptViewProps) => {
  const request = {
    model: data.model,
    max_tokens: data.max_tokens,
    system: data.system,
    messages: data.messages,
  };
  return (
    <div className="space-y-3">
      {data.error && <Typography color="destructive">{data.error.message}</Typography>}
      <Facts
        facts={[
          { term: 'Model', value: `${data.provider} · ${data.model}` },
          { term: 'Input', value: `${data.input_tokens.toLocaleString('en')} tokens (counted)` },
          { term: 'Output cap', value: `${data.max_tokens.toLocaleString('en')} tokens` },
          { term: 'Worst case', value: formatUsd(data.worst_case_cost_usd) },
        ]}
      />
      <blockquote className="border-l border-input pl-3">
        <Typography variant="small" color="muted">
          {data.system}
        </Typography>
      </blockquote>
      <Collapsible>
        <CollapsibleTrigger className="group voice-pencil min-h-8 cursor-pointer text-sm text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid">
          <span className="group-data-[state=open]:hidden">{COPY.showPrompt}</span>
          <span className="hidden group-data-[state=open]:inline">{COPY.hidePrompt}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="voice-data mt-2 max-h-96 overflow-auto rounded-sm bg-background p-3 text-xs leading-relaxed">
            {JSON.stringify(request, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export { PromptView };
