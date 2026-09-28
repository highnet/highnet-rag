import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const segmentVariants = cva('h-full min-w-px shrink-0 border-r border-card last:border-r-0', {
  variants: {
    tone: {
      pencil: 'bg-primary',
      bm25: 'bg-chart-2',
      vector: 'bg-chart-1',
      fused: 'bg-chart-3',
      neutral: 'bg-chart-5',
      soft: 'bg-chart-5/35',
      ink: 'bg-foreground',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
    },
  },
  defaultVariants: { tone: 'pencil' },
});

export type BarSegment = VariantProps<typeof segmentVariants> & { key: string; value: number };

type BarProps = {
  segments: BarSegment[];
  max: number;
  marks?: number[];
  size?: 'sm' | 'md';
  className?: string;
};

const pct = (value: number, max: number) => `${Math.min(Math.max(value / max, 0), 1) * 100}%`;

// A 1px-ruled track on the pad with filled segments laid end to end, plus optional tick marks
// (thresholds). Widths are data, so they are the one place inline styles are used.
const Bar = ({ segments, max, marks = [], size = 'md', className }: BarProps) => {
  return (
    <div
      data-slot="bar"
      className={cn(
        'relative flex w-full overflow-visible border border-input bg-muted/60',
        size === 'sm' ? 'h-1.5' : 'h-3',
        className,
      )}
    >
      {segments.map(({ key, value, tone }) => (
        <div key={key} className={segmentVariants({ tone })} style={{ width: pct(value, max) }} />
      ))}
      {marks.map((mark) => (
        <div
          key={mark}
          className="absolute -inset-y-1 w-px bg-foreground"
          style={{ left: pct(mark, max) }}
        />
      ))}
    </div>
  );
};

export { Bar, pct, segmentVariants };
