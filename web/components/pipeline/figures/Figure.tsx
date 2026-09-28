import { type ReactNode } from 'react';

import { Typography } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';

type FigureProps = {
  alt: string;
  caption?: string;
  className?: string;
  children: ReactNode;
};

// A step's picture. The drawing is one image to assistive tech, described by `alt` with the
// same numbers; the caption says how to read it.
const Figure = ({ alt, caption, className, children }: FigureProps) => {
  return (
    <figure data-slot="figure" className={cn('space-y-2', className)}>
      <div role="img" aria-label={alt}>
        {children}
      </div>
      {caption && (
        <Typography as="figcaption" variant="small" color="muted" className="max-w-[68ch]">
          {caption}
        </Typography>
      )}
    </figure>
  );
};

export { Figure };
