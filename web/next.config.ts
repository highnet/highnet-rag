import type { NextConfig } from 'next';

// Static export: FastAPI serves web/out from the same origin as /api.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
