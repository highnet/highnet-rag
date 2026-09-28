import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlert, FlaskConical, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

const noticeVariants = cva(
  'flex items-start gap-3 rounded-sm border bg-card px-4 py-3 text-sm leading-normal',
  {
    variants: {
      tone: {
        note: 'border-primary/60 text-foreground',
        warning: 'border-warning text-foreground',
        error: 'border-destructive text-foreground',
      },
    },
    defaultVariants: { tone: 'note' },
  },
);

const ICONS = { note: FlaskConical, warning: TriangleAlert, error: CircleAlert } as const;
const ICON_TONES = { note: 'text-primary', warning: 'text-warning', error: 'text-destructive' };

type NoticeProps = VariantProps<typeof noticeVariants> & {
  children: ReactNode;
  className?: string;
};

const Notice = ({ tone, children, className }: NoticeProps) => {
  const key = tone ?? 'note';
  const Icon = ICONS[key];
  return (
    <div
      data-slot="notice"
      role={key === 'error' ? 'alert' : 'status'}
      className={cn(noticeVariants({ tone }), className)}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', ICON_TONES[key])} />
      <div className="max-w-[80ch] min-w-0 flex-1">{children}</div>
    </div>
  );
};

export { Notice, noticeVariants };
