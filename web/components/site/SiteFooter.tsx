import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';

const F = COPY.footer;

type FooterColumnProps = {
  id: string;
  title: string;
  links: readonly { href: string; text: string }[];
};

const FooterColumn = ({ id, title, links }: FooterColumnProps) => {
  return (
    <nav aria-labelledby={id}>
      <Typography variant="label" color="muted" as="h2" id={id}>
        {title}
      </Typography>
      <ul className="mt-1">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="-mx-1 inline-flex min-h-8 items-center rounded-sm px-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              {link.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// The site map, the project links and the corpus attribution the licence asks for.
const SiteFooter = () => {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pt-16 pb-10 md:px-8">
      <div className="grid grid-cols-2 gap-x-10 gap-y-6 border-t pt-6 sm:grid-cols-[auto_auto_minmax(0,1fr)]">
        <FooterColumn
          id="footer-pages"
          title={F.pages}
          links={COPY.nav.links.map(({ href, text }) => ({ href, text }))}
        />
        <FooterColumn id="footer-project" title={F.project} links={F.projectLinks} />
        <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
          <Typography variant="data" as="p" className="font-semibold">
            {COPY.siteName}
          </Typography>
          <Typography variant="small" color="muted" className="mt-1 max-w-[52ch]">
            {COPY.tagline}
          </Typography>
          <Typography variant="small" color="muted" className="mt-3 max-w-[52ch]">
            {F.corpus}
          </Typography>
        </div>
      </div>
    </footer>
  );
};

export { SiteFooter };
