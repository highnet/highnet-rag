import type { Metadata, Viewport } from 'next';
import { Recursive } from 'next/font/google';
import { type ReactNode } from 'react';

import { themeScript } from '@/components/site/ThemeToggle';
import { COPY } from '@/content/copy';

import './globals.css';

const recursive = Recursive({
  subsets: ['latin'],
  axes: ['CASL', 'MONO', 'slnt'],
  variable: '--font-recursive',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${COPY.siteName}: ${COPY.tagline}`,
  description:
    'A transparent RAG teaching tool: every step between a question and its cited answer, traced live with timing, tokens and cost.',
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
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
