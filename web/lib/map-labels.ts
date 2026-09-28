// Callout placement for the corpus map. Everything is in view units (the plot's 0-100 box).
// Each label tries eight spots around its dot; if all are taken it is pushed outward, away
// from the question, and gets a leader line back to its dot, as on an engineering drawing.

export type Box = { x: number; y: number; w: number; h: number };

export type LabelRequest = { key: number; x: number; y: number; w: number; h: number };

export type PlacedLabel = {
  key: number;
  box: Box;
  leader: { x1: number; y1: number; x2: number; y2: number } | null;
};

// Preferred order: above right, below right, above left, below left, then the four sides.
const ANCHORS: [number, number][] = [
  [1, -1],
  [1, 1],
  [-1, -1],
  [-1, 1],
  [1, 0],
  [-1, 0],
  [0, -1],
  [0, 1],
];

const PUSH_STEPS = 12;

export const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const inside = (box: Box, size: number) =>
  box.x >= 0 && box.y >= 0 && box.x + box.w <= size && box.y + box.h <= size;

const anchorBox = (label: LabelRequest, [dx, dy]: [number, number], gap: number): Box => ({
  x: dx > 0 ? label.x + gap : dx < 0 ? label.x - gap - label.w : label.x - label.w / 2,
  y: dy > 0 ? label.y + gap : dy < 0 ? label.y - gap - label.h : label.y - label.h / 2,
  w: label.w,
  h: label.h,
});

export const placeLabels = (
  labels: LabelRequest[],
  obstacles: Box[],
  away: { x: number; y: number },
  gap: number,
  size = 100,
): PlacedLabel[] => {
  const taken = [...obstacles];
  const free = (box: Box) => inside(box, size) && !taken.some((t) => overlaps(box, t));
  return labels.map((label) => {
    const spot = ANCHORS.map((anchor) => anchorBox(label, anchor, gap)).find(free);
    if (spot) {
      taken.push(spot);
      return { key: label.key, box: spot, leader: null };
    }
    // Push outward along the line from the question through the dot.
    const dx = label.x - away.x;
    const dy = label.y - away.y;
    const length = Math.hypot(dx, dy);
    const [ux, uy] = length > 0 ? [dx / length, dy / length] : [Math.SQRT1_2, -Math.SQRT1_2];
    let box: Box = anchorBox(label, [1, -1], gap);
    for (let step = 1; step <= PUSH_STEPS; step += 1) {
      const reach = gap + step * label.h;
      const cx = Math.min(Math.max(label.x + ux * reach, label.w / 2), size - label.w / 2);
      const cy = Math.min(Math.max(label.y + uy * reach, label.h / 2), size - label.h / 2);
      box = { x: cx - label.w / 2, y: cy - label.h / 2, w: label.w, h: label.h };
      if (free(box)) break;
    }
    taken.push(box);
    return {
      key: label.key,
      box,
      leader: { x1: label.x, y1: label.y, x2: box.x + box.w / 2, y2: box.y + box.h / 2 },
    };
  });
};
