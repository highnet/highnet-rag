import type { Metadata, Viewport } from 'next';
import { Recursive } from 'next/font/google';
import { type ReactNode } from 'react';

import { themeScript } from '@/components/site/ThemeToggle';
import { COPY } from '@/content/copy';
import { SITE_DESCRIPTION, SITE_URL, structuredData } from '@/lib/site';

import './globals.css';

const recursive = Recursive({
  subsets: ['latin'],
  axes: ['CASL', 'MONO', 'slnt'],
  variable: '--font-recursive',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${COPY.siteName}: ${COPY.tagline}`, template: `%s · ${COPY.siteName}` },
  description: SITE_DESCRIPTION,
  applicationName: COPY.siteName,
  authors: [{ name: 'highnet', url: 'https://highnet.at' }],
  keywords: [
    'RAG',
    'retrieval-augmented generation',
    'BM25',
    'vector search',
    'reranking',
    'Claude',
  ],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef3e4' },
    { media: '(prefers-color-scheme: dark)', color: '#121913' },
  ],
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en" className={recursive.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
};

export default RootLayout;
