import type { Metadata } from 'next';

import { PipelineExplorer } from '@/components/pipeline/PipelineExplorer';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { COPY } from '@/content/copy';
import { pageMetadata, SITE_DESCRIPTION } from '@/lib/site';

export const metadata: Metadata = pageMetadata(
  '/',
  `${COPY.siteName}: ${COPY.tagline}`,
  SITE_DESCRIPTION,
);

const Page = () => {
  return (
    <>
      <SiteHeader current="pipeline" />
      <main className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-12">
        <PipelineExplorer />
      </main>
      <SiteFooter />
    </>
  );
};

export default Page;
