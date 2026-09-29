import { type ComponentProps, type ElementType } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const typographyVariants = cva('', {
  variants: {
    variant: {
      display:
        'text-[clamp(2rem,1.4rem+2.4vw,3.5rem)] leading-[1.04] font-[650] tracking-[-0.02em] text-balance',
      sheetTitle:
        'text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] leading-[1.1] font-[650] tracking-[-0.01em] text-balance',
      stepHeading: 'text-lg leading-snug font-semibold',
      body: 'max-w-[68ch] text-base leading-relaxed text-pretty',
      small: 'text-sm leading-normal',
      marginNote: 'voice-pencil text-[15px] leading-normal font-[450] text-primary',
      data: 'voice-data text-sm leading-normal',
      label: 'voice-data text-xs leading-tight font-medium tracking-[0.04em]',
    },
    color: {
      default: '',
      muted: 'text-muted-foreground',
      pencil: 'text-primary',
      destructive: 'text-destructive',
      warning: 'text-warning',
      success: 'text-success',
    },
    truncate: {
      true: 'truncate',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'body',
    color: 'default',
    truncate: false,
  },
});

const defaultElement: Record<string, ElementType> = {
  display: 'h1',
  sheetTitle: 'h1',
  stepHeading: 'h3',
  body: 'p',
  small: 'p',
  marginNote: 'p',
  data: 'span',
  label: 'span',
};

type TypographyProps = Omit<ComponentProps<'p'>, 'color'> &
  VariantProps<typeof typographyVariants> & {
    as?: ElementType;
  };

const Typography = ({ as, variant, color, truncate, className, ...props }: TypographyProps) => {
  const Comp = as ?? defaultElement[variant ?? 'body'];
  return (
    <Comp
      data-slot="typography"
      className={cn(typographyVariants({ variant, color, truncate }), className)}
      {...props}
    />
  );
};

export { Typography, typographyVariants };
