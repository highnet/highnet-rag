import { formatMs, formatTokens, formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';

type ReadoutProps = {
  ms: number;
  tokens: number;
  costUsd: number;
  className?: string;
};

// The measured cost of one step: time, tokens, dollars. Always from the trace.
const Readout = ({ ms, tokens, costUsd, className }: ReadoutProps) => {
  return (
    <dl
      data-slot="readout"
      className={cn(
        'voice-data flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground',
        className,
      )}
    >
      <div className="flex gap-1">
        <dt className="sr-only">Time</dt>
        <dd>{formatMs(ms)}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="sr-only">Tokens</dt>
        <dd>{formatTokens(tokens)}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="sr-only">Cost</dt>
        <dd>{formatUsd(costUsd)}</dd>
      </div>
    </dl>
  );
};

export { Readout };
