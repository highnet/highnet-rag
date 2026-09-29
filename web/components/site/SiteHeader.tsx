import Link from 'next/link';

import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { cn } from '@/lib/utils';

import { HeaderBar } from './HeaderBar';
import { ThemeToggle } from './ThemeToggle';

export type SitePage = (typeof COPY.nav.links)[number]['key'];

type SiteHeaderProps = {
  current: SitePage;
};

const SiteHeader = ({ current }: SiteHeaderProps) => {
  return (
    <HeaderBar>
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 md:px-8 md:py-3">
        {/* When large text leaves no room, the links wrap under the name instead of overlapping it. */}
        <div className="flex shrink-0 items-baseline gap-3">
          <Link
            href="/"
            className="voice-data -mx-1 inline-flex min-h-10 items-center rounded-sm px-1 text-base font-semibold whitespace-nowrap hover:bg-accent"
          >
            {COPY.siteName}
          </Link>
          {/* On the pipeline page the hero's headline says it; the tagline would repeat it. */}
          {current !== 'pipeline' && (
            <Typography variant="small" color="muted" as="span" className="hidden lg:inline">
              {COPY.tagline}
            </Typography>
          )}
        </div>
        <div className="-ml-1.5 flex flex-wrap items-center gap-1 sm:gap-3">
          <nav aria-label={COPY.nav.label}>
            <ul className="flex items-center sm:gap-1">
              {COPY.nav.links.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    aria-current={link.key === current ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-10 items-center rounded-sm px-1.5 text-sm sm:px-2.5 text-muted-foreground underline-offset-4 hover:bg-accent hover:text-foreground',
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
    </HeaderBar>
  );
};

export { SiteHeader };
