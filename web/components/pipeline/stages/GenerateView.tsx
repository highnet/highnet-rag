import { Typography } from '@/components/ui/Typography';
import type { GenerateData } from '@/lib/stage-data';

import { CostFigure } from '../figures/CostFigure';
import { Facts } from './Facts';

type GenerateViewProps = { data: GenerateData | null; streamed: string; streaming: boolean };

const GenerateView = ({ data, streamed, streaming }: GenerateViewProps) => {
  return (
    <div className="space-y-3">
      <Typography className="text-muted-foreground">
        {data?.answer ?? streamed}
        {streaming && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[1.1em] w-0.5 animate-caret bg-primary align-text-bottom"
          />
        )}
      </Typography>
      {data && <CostFigure data={data} />}
      {data && (
        <Facts
          facts={[
            { term: 'Model', value: `${data.provider} · ${data.model}` },
            {
              term: 'Tokens',
              value: `${data.usage.input_tokens.toLocaleString('en')} in · ${data.usage.output_tokens.toLocaleString('en')} out`,
            },
            { term: 'Stopped', value: data.stop_reason ?? 'unknown' },
          ]}
        />
      )}
    </div>
  );
};

export { GenerateView };
