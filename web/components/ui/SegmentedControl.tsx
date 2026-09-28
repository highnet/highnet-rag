import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const segmentedControlVariants = cva(
  'inline-flex rounded-sm border border-input bg-card has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
  {
    variants: {
      size: {
        default: '[&_[data-slot=segment]]:h-9.5 [&_[data-slot=segment]]:px-3',
        sm: '[&_[data-slot=segment]]:h-7.5 [&_[data-slot=segment]]:px-2.5',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

type SegmentedOption = { value: string; label: ReactNode; description?: string };

type SegmentedControlProps = VariantProps<typeof segmentedControlVariants> & {
  name: string;
  labelledBy: string;
  options: SegmentedOption[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
};

// Native radios under the hood: arrow keys, form semantics and screen-reader announcements
// come for free. The checked segment is drawn in blue pencil and marked by weight too.
const SegmentedControl = ({
  name,
  labelledBy,
  options,
  value,
  disabled,
  onChange,
  size,
  className,
}: SegmentedControlProps) => {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      data-slot="segmented-control"
      className={cn(segmentedControlVariants({ size }), className)}
    >
      {options.map((option) => (
        <label
          key={option.value}
          data-slot="segment"
          title={option.description}
          className="voice-data inline-flex cursor-pointer items-center border-l border-input text-sm text-muted-foreground transition-colors select-none first:border-l-0 hover:bg-accent hover:text-foreground has-[:checked]:bg-accent has-[:checked]:font-semibold has-[:checked]:text-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:hover:bg-transparent"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
};

export { SegmentedControl, segmentedControlVariants };
