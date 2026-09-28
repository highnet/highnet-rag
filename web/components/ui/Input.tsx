import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type InputProps = ComponentProps<'input'>;

const Input = ({ className, type = 'text', ...props }: InputProps) => {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-sm border border-input bg-card px-3 text-base text-foreground transition-colors placeholder:text-muted-foreground hover:border-foreground/60 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-transparent aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
};

export { Input };
