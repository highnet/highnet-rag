import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';

import { ThemeToggle } from './ThemeToggle';

const SiteHeader = () => {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-5 pb-2 md:px-8">
      <div className="flex min-w-0 items-baseline gap-3">
        <Typography variant="data" as="span" className="text-base font-semibold">
          {COPY.siteName}
        </Typography>
        <Typography variant="small" color="muted" as="span" className="hidden sm:inline">
          {COPY.tagline}
        </Typography>
      </div>
      <ThemeToggle />
    </header>
  );
};

export { SiteHeader };
