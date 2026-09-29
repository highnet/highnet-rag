import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// jsdom has no matchMedia. Tests pick the layout by setting `window.__wide` (default: wide).
declare global {
  var __wide: boolean;
}

// A few tests run in plain Node (the build-time share image); they have no window to set up.
const browser = typeof window !== 'undefined';

beforeEach(() => {
  if (!browser) return;
  globalThis.__wide = true;
  window.matchMedia = (query: string) =>
    ({
      matches: globalThis.__wide,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
});

// The explorer writes its settings into the URL; start every test from a clean one.
afterEach(() => {
  if (!browser) return;
  cleanup();
  window.history.replaceState(null, '', '/');
});
