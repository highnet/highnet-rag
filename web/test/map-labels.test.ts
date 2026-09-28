import { describe, expect, it } from 'vitest';

import { overlaps, placeLabels } from '@/lib/map-labels';

const label = (key: number, x: number, y: number) => ({ key, x, y, w: 4, h: 3 });

describe('map callouts', () => {
  it('puts a label above and to the right of its dot when that spot is free', () => {
    const [placed] = placeLabels([label(1, 50, 50)], [], { x: 0, y: 0 }, 1);
    expect(placed.box).toEqual({ x: 51, y: 46, w: 4, h: 3 });
    expect(placed.leader).toBeNull();
  });

  it('tries the other anchors, and never overlaps an obstacle or an earlier label', () => {
    const blocked = { x: 50, y: 40, w: 20, h: 10 }; // covers above right
    const placed = placeLabels([label(1, 50, 50), label(2, 50, 50)], [blocked], { x: 0, y: 0 }, 1);
    expect(placed[0].box).toEqual({ x: 51, y: 51, w: 4, h: 3 }); // below right
    expect(overlaps(placed[1].box, placed[0].box)).toBe(false);
    expect(overlaps(placed[1].box, blocked)).toBe(false);
  });

  it('pushes a boxed-in label away from the question and draws a leader back to its dot', () => {
    const wall = { x: 40, y: 40, w: 20, h: 20 }; // every anchor around (50, 50) is covered
    const [placed] = placeLabels([label(1, 50, 50)], [wall], { x: 40, y: 50 }, 1);
    expect(overlaps(placed.box, wall)).toBe(false);
    expect(placed.box.x).toBeGreaterThan(50); // pushed right, away from the question
    expect(placed.leader).toEqual({
      x1: 50,
      y1: 50,
      x2: placed.box.x + 2,
      y2: placed.box.y + 1.5,
    });
  });

  it('keeps pushed labels on the plot, even with nowhere free to go', () => {
    const everything = { x: 0, y: 0, w: 100, h: 100 };
    const [placed] = placeLabels([label(1, 99, 1)], [everything], { x: 99, y: 1 }, 1);
    expect(placed.box.x + placed.box.w).toBeLessThanOrEqual(100);
    expect(placed.box.y).toBeGreaterThanOrEqual(0);
    expect(placed.leader).not.toBeNull();
  });
});
