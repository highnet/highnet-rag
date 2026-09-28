import { Check, Circle, LoaderCircle, Minus, TriangleAlert, X } from 'lucide-react';

import { COPY } from '@/content/copy';
import { cn } from '@/lib/utils';

export type StepStatus = 'pending' | 'running' | 'ok' | 'skipped' | 'warning' | 'error';

const ICONS = {
  pending: Circle,
  running: LoaderCircle,
  ok: Check,
  skipped: Minus,
  warning: TriangleAlert,
  error: X,
} as const;

const TONES: Record<StepStatus, string> = {
  pending: 'text-muted-foreground',
  running: 'text-primary',
  ok: 'text-success',
  skipped: 'text-muted-foreground',
  warning: 'text-warning',
  error: 'text-destructive',
};

type StatusMarkProps = {
  status: StepStatus;
  className?: string;
};

// A state is always a glyph plus a word, never colour alone.
const StatusMark = ({ status, className }: StatusMarkProps) => {
  const Icon = ICONS[status];
  return (
    <span
      data-slot="status-mark"
      className={cn(
        'voice-data inline-flex items-center gap-1 text-xs font-medium',
        TONES[status],
        className,
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={2.25}
        className={cn('size-3.5', status === 'running' && 'animate-spin')}
      />
      {COPY.status[status]}
    </span>
  );
};

export { StatusMark };
