'use client';

import {
  Fragment,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowRight, ArrowUp, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { fetchCorpusMap } from '@/lib/api';
import { type Box, placeLabels } from '@/lib/map-labels';
import type { ContextChunk, CorpusMapData } from '@/lib/stage-data';
import { cn } from '@/lib/utils';

type CorpusMapProps = {
  chunkSet: string;
  query: { x: number; y: number };
  explained: [number, number];
  neighbours: number[];
  retrieved: ContextChunk[];
};

type MapState =
  | { status: 'loading' }
  | { status: 'ready'; map: CorpusMapData }
  | { status: 'error'; message: string };

type MapPoint = CorpusMapData['points'][number];

const F = COPY.figures.map;
const VIEW = 100;
const PAD = 4;
const HIT = 3; // view units: how close the pointer must be to pick a dot
const CROSS = 3.5; // crosshair arm length, view units
const INSET = 30; // detail inset size, view units
const RANK_LABEL_PX = { char: 8, pad: 6, h: 14 };
const YOU_LABEL_PX = { w: 108, h: 20 };
const DEFAULT_WIDTH_PX = 400;

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

// The whole chunk set on its two PCA axes, the question dropped in with the same PCA, and the
// passages retrieved for it. Pointing at a dot lights up every chunk of its article.
const CorpusMap = ({ chunkSet, query, explained, neighbours, retrieved }: CorpusMapProps) => {
  const [state, setState] = useState<MapState>({ status: 'loading' });
  const [pointed, setPointed] = useState<MapPoint | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [widthPx, setWidthPx] = useState(DEFAULT_WIDTH_PX);

  // Labels keep a fixed size in pixels, so their size in view units depends on the plot width.
  useEffect(() => {
    const plot = plotRef.current;
    if (!plot || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidthPx(entry.contentRect.width);
    });
    observer.observe(plot);
    return () => observer.disconnect();
  }, [state.status]);

  useEffect(() => {
    let live = true;
    fetchCorpusMap(chunkSet)
      .then((map) => live && setState({ status: 'ready', map }))
      .catch((error: unknown) => {
        if (live)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
      });
    return () => {
      live = false;
    };
  }, [chunkSet]);

  const map = state.status === 'ready' ? state.map : null;

  // Data space -> view box, keeping the aspect square and y pointing up.
  const scale = useMemo(() => {
    const xs = [query.x, ...(map?.points.map((p) => p[2]) ?? [])];
    const ys = [query.y, ...(map?.points.map((p) => p[3]) ?? [])];
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const span = Math.max(x1 - x0, y1 - y0, 1e-9);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const unit = (VIEW - 2 * PAD) / span;
    return {
      x: (x: number) => VIEW / 2 + (x - cx) * unit,
      y: (y: number) => VIEW / 2 - (y - cy) * unit,
    };
  }, [map, query.x, query.y]);

  const byId = useMemo(() => new Map((map?.points ?? []).map((p) => [p[0], p])), [map]);
  const pointedDoc = pointed?.[1] ?? null;

  // Thousands of dots: drawn once per map, never on hover.
  const dots = useMemo(
    () =>
      map?.points.map(([id, , x, y]) => (
        <circle
          key={id}
          cx={scale.x(x)}
          cy={scale.y(y)}
          r={0.55}
          className="fill-chart-5 opacity-40"
        />
      )),
    [map, scale],
  );

  const pick = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const box = svgRef.current?.getBoundingClientRect();
      if (!map || !box || box.width === 0) return;
      const vx = ((event.clientX - box.left) / box.width) * VIEW;
      const vy = ((event.clientY - box.top) / box.height) * VIEW;
      let best: MapPoint | null = null;
      let bestDistance = HIT * HIT;
      for (const point of map.points) {
        const d = (scale.x(point[2]) - vx) ** 2 + (scale.y(point[3]) - vy) ** 2;
        if (d < bestDistance) {
          best = point;
          bestDistance = d;
        }
      }
      setPointed(best);
    },
    [map, scale],
  );

  if (state.status === 'loading') {
    return (
      <Typography variant="small" color="muted">
        {F.loading}
      </Typography>
    );
  }
  if (state.status === 'error') {
    return (
      <Typography variant="small" color="warning">
        {F.failed} {state.message}
      </Typography>
    );
  }
  const { documents, points } = state.map;
  const title = (id: number) => documents[String(byId.get(id)?.[1])] ?? `#${id}`;
  const distance = (x: number, y: number) => Math.hypot(x - query.x, y - query.y).toFixed(3);
  const retrievedIds = new Set(retrieved.map((c) => c.chunk_id));
  const kept = pct(explained[0] + explained[1]);
  const at = (id: number) => byId.get(id) as MapPoint;
  const shown = retrieved.filter((c) => byId.has(c.chunk_id));
  const near = neighbours.filter((id) => byId.has(id) && !retrievedIds.has(id));
  const qx = scale.x(query.x);
  const qy = scale.y(query.y);
  const px = VIEW / widthPx; // view units per pixel

  // Detail inset: the question's neighbourhood magnified, in the emptiest corner of the plot.
  const corners = [
    { x: 1, y: 1 },
    { x: VIEW - INSET - 1, y: 1 },
    { x: 1, y: VIEW - INSET - 1 },
    { x: VIEW - INSET - 1, y: VIEW - INSET - 1 },
  ];
  const crowd = (c: { x: number; y: number }) =>
    points.filter(([, , x, y]) => {
      const [vx, vy] = [scale.x(x), scale.y(y)];
      return vx >= c.x && vx <= c.x + INSET && vy >= c.y && vy <= c.y + INSET;
    }).length + (qx >= c.x && qx <= c.x + INSET && qy >= c.y && qy <= c.y + INSET ? 1e6 : 0);
  const inset = corners.reduce((best, c) => (crowd(c) < crowd(best) ? c : best));
  const reach = Math.max(
    ...near.map((id) => Math.hypot(at(id)[2] - query.x, at(id)[3] - query.y)),
    1e-6,
  );
  const half = reach * 1.6; // data units from the question to the inset's edge
  const detail = {
    x: (x: number) => 50 + ((x - query.x) / half) * 50,
    y: (y: number) => 50 - ((y - query.y) / half) * 50,
    has: (x: number, y: number) => Math.abs(x - query.x) <= half && Math.abs(y - query.y) <= half,
  };
  const zoomBox = Math.max(Math.abs(scale.x(query.x + half) - qx), CROSS + 1);
  const insetBox: Box = { x: inset.x, y: inset.y, w: INSET, h: INSET };

  // Callouts: the question's note first, then the ranks, never over dots, the crosshair,
  // the inset or each other.
  const dotBoxes: Box[] = shown.map((c) => {
    const [, , x, y] = at(c.chunk_id);
    return { x: scale.x(x) - 1.4, y: scale.y(y) - 1.4, w: 2.8, h: 2.8 };
  });
  const crossBox: Box = { x: qx - CROSS, y: qy - CROSS, w: 2 * CROSS, h: 2 * CROSS };
  const placed = placeLabels(
    [
      { key: -1, x: qx, y: qy, w: YOU_LABEL_PX.w * px, h: YOU_LABEL_PX.h * px },
      ...shown.map((c) => {
        const [, , x, y] = at(c.chunk_id);
        const w = (String(c.rank).length * RANK_LABEL_PX.char + RANK_LABEL_PX.pad) * px;
        return { key: c.rank, x: scale.x(x), y: scale.y(y), w, h: RANK_LABEL_PX.h * px };
      }),
    ],
    [...dotBoxes, crossBox, insetBox],
    { x: qx, y: qy },
    CROSS,
  );
  const youLabel = placed[0];
  const rankLabels = placed.slice(1);

  // Pointing at a table row lights its article on the plot, like pointing at its dot.
  const select = (id: number) => () => setPointed(at(id));

  return (
    <figure className="space-y-2">
      <div
        ref={plotRef}
        role="img"
        aria-label={F.alt(
          points.length,
          retrieved.map((c) => `[${c.rank}] ${c.doc_title}`).join(', '),
        )}
        className="relative mx-auto aspect-square w-full max-w-md border-y border-dashed"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="absolute inset-0 size-full touch-none"
          onPointerMove={pick}
          onPointerDown={pick}
          // A finger lifting also 'leaves'; only a mouse moving away should clear the highlight.
          onPointerLeave={(event) => event.pointerType !== 'touch' && setPointed(null)}
        >
          {dots}
          {pointedDoc !== null &&
            points
              .filter((p) => p[1] === pointedDoc)
              .map(([id, , x, y]) => (
                <circle
                  key={id}
                  cx={scale.x(x)}
                  cy={scale.y(y)}
                  r={0.8}
                  className="fill-foreground"
                />
              ))}
          {shown.map((c) => {
            const [, , x, y] = at(c.chunk_id);
            return (
              <circle
                key={c.chunk_id}
                cx={scale.x(x)}
                cy={scale.y(y)}
                r={1.4}
                className="fill-primary stroke-card"
                strokeWidth={0.5}
              />
            );
          })}
          <g className="fill-none stroke-foreground/60" strokeWidth={1}>
            {rankLabels
              .filter((l) => l.leader)
              .map(({ key, leader }) => (
                <line key={key} {...leader} vectorEffect="non-scaling-stroke" />
              ))}
            <rect
              x={qx - zoomBox}
              y={qy - zoomBox}
              width={2 * zoomBox}
              height={2 * zoomBox}
              strokeDasharray="3 2"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={inset.x + INSET / 2 > qx ? qx + zoomBox : qx - zoomBox}
              y1={inset.y + INSET / 2 > qy ? qy + zoomBox : qy - zoomBox}
              x2={inset.x + INSET / 2 > qx ? inset.x : inset.x + INSET}
              y2={inset.y + INSET / 2 > qy ? inset.y : inset.y + INSET}
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <g className="stroke-primary" strokeWidth={0.4}>
            <circle cx={qx} cy={qy} r={2} className="fill-none" />
            <line x1={qx - CROSS} x2={qx + CROSS} y1={qy} y2={qy} />
            <line x1={qx} x2={qx} y1={qy - CROSS} y2={qy + CROSS} />
          </g>
        </svg>

        {/* Detail A: the neighbourhood of the question, magnified. */}
        <div
          className="absolute border border-dashed border-foreground/60 bg-card"
          style={{
            left: `${inset.x}%`,
            top: `${inset.y}%`,
            width: `${INSET}%`,
            height: `${INSET}%`,
          }}
        >
          <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
            {points
              .filter(([, , x, y]) => detail.has(x, y))
              .map(([id, , x, y]) => (
                <circle
                  key={id}
                  cx={detail.x(x)}
                  cy={detail.y(y)}
                  r={1.8}
                  className="fill-chart-5 opacity-40"
                />
              ))}
            {near.map((id) => (
              <circle
                key={id}
                cx={detail.x(at(id)[2])}
                cy={detail.y(at(id)[3])}
                r={4}
                className="fill-none stroke-foreground"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {shown
              .filter((c) => detail.has(at(c.chunk_id)[2], at(c.chunk_id)[3]))
              .map((c) => (
                <circle
                  key={c.chunk_id}
                  cx={detail.x(at(c.chunk_id)[2])}
                  cy={detail.y(at(c.chunk_id)[3])}
                  r={3.5}
                  className="fill-primary"
                />
              ))}
            <g className="stroke-primary" strokeWidth={1.2}>
              <line x1={38} x2={62} y1={50} y2={50} />
              <line x1={50} x2={50} y1={38} y2={62} />
            </g>
          </svg>
          <Typography
            variant="label"
            color="muted"
            as="span"
            className="pointer-events-none absolute top-0.5 left-1 leading-none"
          >
            {F.detail}
          </Typography>
        </div>

        {/* Callouts are HTML over the plot, so they keep their size at any width. */}
        {rankLabels.map(({ key, box }) => (
          <Typography
            key={key}
            variant="label"
            as="span"
            className="pointer-events-none absolute flex items-center justify-center bg-card/85 leading-none text-primary"
            style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
          >
            {key}
          </Typography>
        ))}
        <Typography
          variant="marginNote"
          as="span"
          className="pointer-events-none absolute bg-card/85 px-1 text-sm leading-tight whitespace-nowrap"
          style={{ left: `${youLabel.box.x}%`, top: `${youLabel.box.y}%` }}
        >
          {F.you}
        </Typography>
      </div>
      <div className="mx-auto flex max-w-md flex-wrap justify-between gap-x-4">
        <Typography
          variant="label"
          color="muted"
          as="span"
          className="inline-flex items-center gap-1"
        >
          <ArrowRight aria-hidden className="size-3" />
          {F.axis(1, pct(explained[0]))}
        </Typography>
        <Typography
          variant="label"
          color="muted"
          as="span"
          className="inline-flex items-center gap-1"
        >
          <ArrowUp aria-hidden className="size-3" />
          {F.axis(2, pct(explained[1]))}
        </Typography>
      </div>
      <Typography
        variant="small"
        aria-live="polite"
        className={cn('mx-auto max-w-md min-h-5', pointed === null && 'text-muted-foreground')}
      >
        {pointed === null ? ' ' : F.pointed(title(pointed[0]), pointed[0])}
      </Typography>
      <Typography as="figcaption" variant="small" color="muted" className="max-w-[68ch]">
        {F.caption(kept)}
      </Typography>
      <Button
        variant="pencil"
        size="inline"
        aria-expanded={showTable}
        className="min-h-8 gap-1 text-sm"
        onClick={() => setShowTable((open) => !open)}
      >
        <ChevronDown
          aria-hidden
          className={cn('transition-transform', showTable && 'rotate-180')}
        />
        {showTable ? F.hideTable : F.showTable}
      </Button>
      {showTable && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="voice-data border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="py-1.5 pr-3 font-medium">
                {F.columns.what}
              </th>
              <th scope="col" className="hidden py-1.5 pr-3 text-right font-medium sm:table-cell">
                {F.columns.x}
              </th>
              <th scope="col" className="hidden py-1.5 pr-3 text-right font-medium sm:table-cell">
                {F.columns.y}
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                {F.columns.distance}
              </th>
            </tr>
          </thead>
          <tbody className="voice-data">
            <tr className="border-b border-dashed">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal text-primary">
                {F.you}
              </th>
              <td className="hidden pr-3 text-right sm:table-cell">{query.x.toFixed(3)}</td>
              <td className="hidden pr-3 text-right sm:table-cell">{query.y.toFixed(3)}</td>
              <td className="text-right">–</td>
            </tr>
            {[
              {
                group: F.groups.retrieved,
                rows: shown.map((c) => ({
                  id: c.chunk_id,
                  label: F.retrievedRow(c.rank, c.doc_title),
                })),
              },
              { group: F.groups.nearest, rows: near.map((id) => ({ id, label: title(id) })) },
            ]
              .filter(({ rows }) => rows.length > 0)
              .map(({ group, rows }) => (
                <Fragment key={group}>
                  <tr>
                    <th
                      colSpan={4}
                      scope="colgroup"
                      className="pt-2.5 pb-1 text-left text-xs font-medium text-muted-foreground"
                    >
                      {group}
                    </th>
                  </tr>
                  {rows.map(({ id, label }) => {
                    const [, , x, y] = at(id);
                    return (
                      <tr key={id} className="border-b border-dashed last:border-b-0">
                        <th scope="row" className="py-1 pr-3 text-left font-normal">
                          <Button
                            variant="pencil"
                            size="inline"
                            className="min-h-8 text-left whitespace-normal"
                            onClick={select(id)}
                            onFocus={select(id)}
                          >
                            {label}
                          </Button>{' '}
                          <span className="text-xs text-muted-foreground">#{id}</span>
                        </th>
                        <td className="hidden pr-3 text-right sm:table-cell">{x.toFixed(3)}</td>
                        <td className="hidden pr-3 text-right sm:table-cell">{y.toFixed(3)}</td>
                        <td className="text-right">{distance(x, y)}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
          </tbody>
        </table>
      )}
    </figure>
  );
};

export { CorpusMap };
