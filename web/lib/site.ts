import type { Metadata } from 'next';

import { COPY } from '@/content/copy';

// The public address of the site, for canonical links, the sitemap and share cards.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://highnet-rag.vercel.app';

export const SITE_DESCRIPTION =
  'A transparent RAG teaching tool: every step between a question and its cited answer, from search to citations, with real scores, tokens, timing and cost.';

// Metadata for one page: its title and description, its canonical address, and the same
// words on the share card. The share image is drawn at build time by app/og.png/route.tsx.
export const SHARE_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: `${COPY.siteName}: ${COPY.hero.title}`,
};

export const pageMetadata = (path: string, title: string, description: string): Metadata => {
  const fullTitle = path === '/' ? title : `${title} · ${COPY.siteName}`;
  return {
    title: path === '/' ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: COPY.siteName,
      locale: 'en',
      url: path,
      title: fullTitle,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [SHARE_IMAGE] },
  };
};

// Structured data for search engines: the site, who made it and where its source lives.
export const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: COPY.siteName,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
      author: { '@id': 'https://highnet.at/#author' },
    },
    {
      '@type': 'Person',
      '@id': 'https://highnet.at/#author',
      name: 'highnet',
      url: 'https://highnet.at',
    },
    {
      '@type': 'SoftwareSourceCode',
      name: COPY.siteName,
      description: SITE_DESCRIPTION,
      codeRepository: 'https://github.com/highnet/highnet-rag',
      programmingLanguage: ['Python', 'TypeScript'],
      author: { '@id': 'https://highnet.at/#author' },
    },
  ],
};
