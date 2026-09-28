import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AlgebraKey } from '@/components/formal/AlgebraKey';
import { Formula } from '@/components/formal/Formula';
import { FORMAL, KEY, STEP_FORMULAS } from '@/content/formal';
import { parseFormula } from '@/lib/formula';

describe('formulas', () => {
  it('parses symbols from the key, plain text and subscripts', () => {
    expect(parseFormula('λ_{n} x')).toEqual([
      { kind: 'term', symbol: 'λ' },
      { kind: 'sub', nodes: [{ kind: 'term', symbol: 'n' }] },
      { kind: 'text', text: ' ' },
      { kind: 'text', text: 'x' },
    ]);
  });

  it('explains a symbol on tap, and on hover, in the line below', () => {
    render(<Formula id="f" source={STEP_FORMULAS.bm25} />);
    expect(screen.getByText(FORMAL.hint)).toBeInTheDocument();
    const select = screen.getByRole('button', { name: `τ: ${KEY.τ.name}` });
    fireEvent.click(select);
    expect(select).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(`: ${KEY.τ.meaning}`, { exact: false })).toBeInTheDocument();
    // A tap after a hover keeps the definition open.
    fireEvent.click(select);
    expect(select).toHaveAttribute('aria-expanded', 'true');
    fireEvent.mouseEnter(screen.getByRole('button', { name: `C: ${KEY.C.name}` }));
    expect(screen.getByText(KEY.C.name)).toBeInTheDocument();
    // Leaving restores the tapped symbol rather than clearing it.
    fireEvent.mouseLeave(select.closest('div')!);
    expect(screen.getByText(KEY.τ.name)).toBeInTheDocument();
  });

  it('shows the hint until a symbol is tapped or hovered', () => {
    render(<Formula id="h" source={STEP_FORMULAS.bm25} />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: `C: ${KEY.C.name}` }));
    fireEvent.mouseLeave(screen.getByRole('button', { name: `C: ${KEY.C.name}` }).closest('div')!);
    expect(screen.getByText(FORMAL.hint)).toBeInTheDocument();
  });

  it('draws sub- and superscripts, and the question vector with its subscript', () => {
    const { container, unmount } = render(<Formula id="m" source={STEP_FORMULAS.map_project} />);
    expect(container.querySelector('sup')).toHaveTextContent('T');
    unmount();
    render(<Formula id="f" source={STEP_FORMULAS.embed_query} />);
    const vq = screen.getByRole('button', { name: `vq: ${KEY.vq.name}` });
    fireEvent.click(vq);
    expect(vq.querySelector('sub')).toHaveTextContent('q');
  });

  it('lists the building blocks and the whole run', () => {
    const { rerender } = render(<AlgebraKey agentic={false} />);
    fireEvent.click(screen.getByText(FORMAL.title));
    for (const group of Object.values(FORMAL.groups)) {
      expect(screen.getByRole('heading', { name: group })).toBeInTheDocument();
    }
    const whole = screen.getByRole('heading', { name: FORMAL.whole }).parentElement!;
    expect(within(whole).getByRole('button', { name: /q: question/ })).toBeInTheDocument();
    expect(whole).toHaveTextContent('bm25');
    rerender(<AlgebraKey agentic />);
    expect(whole).toHaveTextContent('search');
  });
});
