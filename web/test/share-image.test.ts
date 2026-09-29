// @vitest-environment node
// The share card is drawn by the build in Node, so it is tested there (the PNG encoder does not
// run under jsdom).
import { describe, expect, it } from 'vitest';

import { GET as shareImage } from '@/app/og.png/route';

describe('share card', () => {
  it('draws the share card as a 1200×630 PNG', async () => {
    const response = shareImage();
    expect(response.headers.get('content-type')).toBe('image/png');
    const png = new Uint8Array(await response.arrayBuffer());
    // PNG signature, then the IHDR width and height.
    expect([...png.slice(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG');
    const view = new DataView(png.buffer);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);
  });
});
