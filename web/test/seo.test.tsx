import { describe, expect, it } from 'vitest';

import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { COPY } from '@/content/copy';
import { pageMetadata, SHARE_IMAGE, SITE_URL, structuredData } from '@/lib/site';

describe('search and sharing', () => {
  it('gives each page its title, canonical address and share card', () => {
    const home = pageMetadata('/', 'Home title', 'About the site');
    expect(home.title).toEqual({ absolute: 'Home title' });
    expect(home.alternates?.canonical).toBe('/');
    const evals = pageMetadata('/evals/', 'Evals', 'How well it works');
    expect(evals.title).toBe('Evals');
    expect(evals.openGraph).toMatchObject({
      url: '/evals/',
      title: `Evals · ${COPY.siteName}`,
      images: [SHARE_IMAGE],
    });
    expect(evals.twitter).toMatchObject({ card: 'summary_large_image', images: [SHARE_IMAGE] });
  });

  it('lists every page in the sitemap and points robots at it', () => {
    expect(sitemap().map((entry) => entry.url)).toEqual(
      COPY.nav.links.map((link) => `${SITE_URL}${link.href}`),
    );
    expect(robots()).toMatchObject({ sitemap: `${SITE_URL}/sitemap.xml` });
  });

  it('describes the site and its source as structured data', () => {
    const types = structuredData['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['WebSite', 'Person', 'SoftwareSourceCode']);
  });
});
