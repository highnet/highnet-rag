'use client';

import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { fetchCorpusMap } from '@/lib/api';
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

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

// The whole chunk set on its two PCA axes, the question dropped in with the same PCA, and the
// passages retrieved for it. Pointing at a dot lights up every chunk of its article.
const CorpusMap = ({ chunkSet, query, explained, neighbours, retrieved }: CorpusMapProps) => {
  const [state, setState] = useState<MapState>({ status: 'loading' });
  const [pointed, setPointed] = useState<MapPoint | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

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

  return (
    <figure className="space-y-2">
      <div
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
          onPointerLeave={() => setPointed(null)}
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
          {neighbours
            .filter((id) => byId.has(id) && !retrievedIds.has(id))
            .map((id) => {
              const [, , x, y] = byId.get(id) as [number, number, number, number];
              return (
                <circle
                  key={id}
                  cx={scale.x(x)}
                  cy={scale.y(y)}
                  r={1.1}
                  className="fill-none stroke-foreground"
                  strokeWidth={0.3}
                />
              );
            })}
          {retrieved
            .filter((c) => byId.has(c.chunk_id))
            .map((c) => {
              const [, , x, y] = byId.get(c.chunk_id) as [number, number, number, number];
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
          <g className="stroke-primary" strokeWidth={0.4}>
            <circle cx={scale.x(query.x)} cy={scale.y(query.y)} r={2} className="fill-none" />
            <line
              x1={scale.x(query.x) - 3.5}
              x2={scale.x(query.x) + 3.5}
              y1={scale.y(query.y)}
              y2={scale.y(query.y)}
            />
            <line
              x1={scale.x(query.x)}
              x2={scale.x(query.x)}
              y1={scale.y(query.y) - 3.5}
              y2={scale.y(query.y) + 3.5}
            />
          </g>
        </svg>
        {/* Labels are HTML over the plot, so they stay readable at any width. */}
        {retrieved
          .filter((c) => byId.has(c.chunk_id))
          .map((c) => {
            const [, , x, y] = byId.get(c.chunk_id) as [number, number, number, number];
            return (
              <Typography
                key={c.chunk_id}
                variant="label"
                as="span"
                className="pointer-events-none absolute translate-x-1.5 -translate-y-full text-primary"
                style={{ left: `${scale.x(x)}%`, top: `${scale.y(y)}%` }}
              >
                {c.rank}
              </Typography>
            );
          })}
        <Typography
          variant="marginNote"
          as="span"
          className={cn(
            'pointer-events-none absolute translate-y-1 text-sm whitespace-nowrap',
            scale.x(query.x) > 70 ? '-translate-x-[calc(100%+12px)]' : 'translate-x-3',
          )}
          style={{ left: `${scale.x(query.x)}%`, top: `${scale.y(query.y)}%` }}
        >
          {F.you}
        </Typography>
      </div>
      <div className="mx-auto flex max-w-md flex-wrap justify-between gap-x-4">
        <Typography variant="label" color="muted" as="span">
          → {F.axis(1, pct(explained[0]))}
        </Typography>
        <Typography variant="label" color="muted" as="span">
          ↑ {F.axis(2, pct(explained[1]))}
        </Typography>
      </div>
      <Typography
        variant="small"
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
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                {F.columns.x}
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">
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
              <td className="pr-3 text-right">{query.x.toFixed(3)}</td>
              <td className="pr-3 text-right">{query.y.toFixed(3)}</td>
              <td className="text-right">–</td>
            </tr>
            {[
              ...retrieved
                .filter((c) => byId.has(c.chunk_id))
                .map((c) => ({ id: c.chunk_id, label: F.retrievedRow(c.rank, c.doc_title) })),
              ...neighbours
                .filter((id) => byId.has(id) && !retrievedIds.has(id))
                .map((id) => ({ id, label: F.neighbourRow(title(id)) })),
            ].map(({ id, label }) => {
              const [, , x, y] = byId.get(id) as [number, number, number, number];
              return (
                <tr key={id} className="border-b border-dashed last:border-b-0">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {label} <span className="text-xs text-muted-foreground">#{id}</span>
                  </th>
                  <td className="pr-3 text-right">{x.toFixed(3)}</td>
                  <td className="pr-3 text-right">{y.toFixed(3)}</td>
                  <td className="text-right">{distance(x, y)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </figure>
  );
};

export { CorpusMap };
