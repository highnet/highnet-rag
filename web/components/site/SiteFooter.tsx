import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';

const SiteFooter = () => {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pt-16 pb-10 md:px-8">
      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-baseline sm:justify-between">
        <Typography variant="small" color="muted">
          {COPY.footer.corpus}
        </Typography>
        <p className="flex gap-4 text-sm">
          <a href="https://github.com/highnet/highnet-rag" className="text-primary underline">
            {COPY.footer.code}
          </a>
          <a href="https://highnet.at" className="text-primary underline">
            {COPY.footer.author}
          </a>
        </p>
      </div>
    </footer>
  );
};

export { SiteFooter };
