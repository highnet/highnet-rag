import type { MetadataRoute } from 'next';

import { COPY } from '@/content/copy';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

// Every page in the header, at its canonical address.
const sitemap = (): MetadataRoute.Sitemap =>
  COPY.nav.links.map((link) => ({ url: `${SITE_URL}${link.href}` }));

export default sitemap;
