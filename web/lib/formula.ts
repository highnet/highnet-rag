import { KEY } from '@/content/formal';

export type FormulaNode =
  | { kind: 'text'; text: string }
  | { kind: 'term'; symbol: string }
  | { kind: 'sub'; nodes: FormulaNode[] }
  | { kind: 'sup'; nodes: FormulaNode[] };

const TOKEN = /_\{([^}]*)\}|\^\{([^}]*)\}|([A-Za-z]+)|(\s+)|(.)/gu;

// Splits a formula into plain text, symbols from the key, `_{…}` subscripts and `^{…}`
// superscripts.
export const parseFormula = (source: string): FormulaNode[] =>
  [...source.matchAll(TOKEN)].map(([, sub, sup, word, , char]): FormulaNode => {
    if (sub !== undefined) return { kind: 'sub', nodes: parseFormula(sub) };
    if (sup !== undefined) return { kind: 'sup', nodes: parseFormula(sup) };
    const symbol = word ?? char;
    if (symbol !== undefined && symbol in KEY) return { kind: 'term', symbol };
    return { kind: 'text', text: symbol ?? ' ' };
  });
