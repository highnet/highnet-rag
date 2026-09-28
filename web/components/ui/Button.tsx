import { type ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm font-sans text-sm font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary),var(--graphite)_18%)] active:translate-y-px disabled:bg-muted disabled:text-muted-foreground',
        quiet:
          'border border-input bg-card text-foreground hover:bg-accent aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-primary disabled:border-border disabled:bg-transparent disabled:text-muted-foreground',
        ghost:
          'text-muted-foreground hover:bg-accent hover:text-foreground disabled:hover:bg-transparent',
        // A symbol in a formula that explains itself when tapped or hovered.
        term: 'voice-data rounded-sm px-0.5 font-normal text-primary underline decoration-dotted underline-offset-4 hover:bg-accent aria-expanded:bg-accent aria-expanded:decoration-solid',
        pencil:
          'voice-pencil h-auto px-0 text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid disabled:text-muted-foreground disabled:no-underline',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-[13px]',
        icon: 'size-10',
        inline: 'h-auto p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return (
    <button
      data-slot="button"
      data-variant={variant ?? 'primary'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
};

export { Button, buttonVariants };
