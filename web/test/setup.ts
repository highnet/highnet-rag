import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// jsdom has no matchMedia. Tests pick the layout by setting `window.__wide` (default: wide).
declare global {
  var __wide: boolean;
}

beforeEach(() => {
  globalThis.__wide = true;
  window.matchMedia = (query: string) =>
    ({
      matches: globalThis.__wide,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
});

afterEach(() => cleanup());
