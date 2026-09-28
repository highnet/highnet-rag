import { formatMs, formatTokens, formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';

type ReadoutProps = {
  ms: number;
  tokens: number;
  costUsd: number;
  className?: string;
};

// The measured cost of one step: time, tokens, dollars. Always from the trace. Each value
// carries its unit, so screen readers get one plain sentence instead of repeated labels.
const Readout = ({ ms, tokens, costUsd, className }: ReadoutProps) => {
  const time = formatMs(ms);
  const count = formatTokens(tokens);
  const cost = formatUsd(costUsd);
  return (
    <p
      data-slot="readout"
      className={cn(
        'voice-data flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className="sr-only">{`${time}, ${count.replace(/tok$/, 'tokens')}, ${cost}`}</span>
      <span aria-hidden>{time}</span>
      <span aria-hidden>{count}</span>
      <span aria-hidden>{cost}</span>
    </p>
  );
};

export { Readout };
