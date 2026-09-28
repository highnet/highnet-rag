import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { cn } from '@/lib/utils';

import { ThemeToggle } from './ThemeToggle';

export type SitePage = (typeof COPY.nav.links)[number]['key'];

type SiteHeaderProps = {
  current: SitePage;
};

const SiteHeader = ({ current }: SiteHeaderProps) => {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-4 pb-1 md:px-8 md:pt-5 md:pb-2">
      <div className="flex min-w-0 items-baseline gap-3">
        <Typography variant="data" as="span" className="text-base font-semibold">
          {COPY.siteName}
        </Typography>
        <Typography variant="small" color="muted" as="span" className="hidden lg:inline">
          {COPY.tagline}
        </Typography>
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <nav aria-label={COPY.nav.label}>
          <ul className="flex items-center gap-1">
            {COPY.nav.links.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  aria-current={link.key === current ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-sm px-2.5 text-sm text-muted-foreground underline-offset-4 hover:bg-accent hover:text-foreground',
                    link.key === current &&
                      'font-semibold text-foreground underline decoration-primary decoration-2',
                  )}
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
};

export { SiteHeader };
