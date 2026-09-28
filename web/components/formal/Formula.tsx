'use client';

import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { FORMAL, KEY } from '@/content/formal';
import { type FormulaNode, parseFormula } from '@/lib/formula';
import { cn } from '@/lib/utils';

// How a symbol is drawn: vq is v with a subscript q; everything else as written.
const glyph = (symbol: string): ReactNode =>
  symbol === 'vq' ? (
    <>
      v<sub>q</sub>
    </>
  ) : (
    symbol
  );

type FormulaProps = {
  source: string;
  id: string;
  className?: string;
};

// A formula whose symbols explain themselves. Tapping (or hovering) a symbol writes its meaning
// on the line below, in place, so it works the same on a phone as with a mouse.
const Formula = ({ source, id, className }: FormulaProps) => {
  const [active, setActive] = useState<string | null>(null);
  const definitionId = `${id}-definition`;

  const render = (nodes: FormulaNode[]): ReactNode[] =>
    nodes.map((node, i) => {
      if (node.kind === 'sub' || node.kind === 'sup') {
        const Script = node.kind;
        return <Script key={i}>{render(node.nodes)}</Script>;
      }
      if (node.kind === 'text') return <span key={i}>{node.text}</span>;
      const open = active === node.symbol;
      return (
        <Button
          key={i}
          type="button"
          variant="term"
          size="inline"
          aria-expanded={open}
          aria-controls={definitionId}
          aria-label={`${node.symbol}: ${KEY[node.symbol].name}`}
          onClick={() => setActive(node.symbol)}
          onMouseEnter={() => setActive(node.symbol)}
          className="text-[length:inherit]"
        >
          {glyph(node.symbol)}
        </Button>
      );
    });

  const entry = active ? KEY[active] : null;
  return (
    <div className={cn('space-y-1', className)} onMouseLeave={() => setActive(null)}>
      <p className="voice-data text-sm leading-relaxed break-words">
        {render(parseFormula(source))}
      </p>
      <p id={definitionId} aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
        {entry ? (
          <>
            <span className="voice-data font-semibold text-primary">{glyph(active!)}</span>{' '}
            <span className="font-semibold text-foreground">{entry.name}</span>: {entry.meaning}
          </>
        ) : (
          FORMAL.hint
        )}
      </p>
    </div>
  );
};

export { Formula, glyph };
