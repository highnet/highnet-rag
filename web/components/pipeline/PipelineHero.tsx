import { ArrowDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { buttonVariants } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';

type PipelineHeroProps = {
  intro: string;
  diagram: ReactNode;
};

// The page's opening: what RAG is and what this site shows, beside the whole pipeline drawn as
// one figure. The figure is the hero's only picture; it is the real pipeline, linked to its steps.
const PipelineHero = ({ intro, diagram }: PipelineHeroProps) => {
  return (
    <section
      aria-labelledby="hero-title"
      className="grid items-start gap-x-12 gap-y-8 pb-4 md:pb-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <div className="space-y-5">
        <Typography variant="display" id="hero-title">
          {COPY.hero.title}
        </Typography>
        <dl className="max-w-[68ch]">
          <dt className="flex flex-wrap items-baseline gap-x-2">
            <Typography variant="data" as="dfn" className="text-base font-semibold not-italic">
              {COPY.rag.term}
            </Typography>
            <Typography variant="small" color="muted" as="span">
              {COPY.rag.expansion}
            </Typography>
          </dt>
          <dd className="mt-1">
            <Typography>{COPY.rag.definition}</Typography>
          </dd>
        </dl>
        <Typography color="muted">{intro}</Typography>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <a href="#sheet-title" className={buttonVariants({ variant: 'primary' })}>
            {COPY.hero.action}
            <ArrowDown aria-hidden />
          </a>
          <Link
            href="/corpus/"
            className="voice-pencil inline-flex min-h-10 items-center gap-1 text-sm text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid"
          >
            {COPY.hero.corpus}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>
      {diagram}
    </section>
  );
};

export { PipelineHero };
