import { PipelineExplorer } from '@/components/pipeline/PipelineExplorer';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

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
