const integer = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

export const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`);

export const formatTokens = (tokens: number) => `${integer.format(tokens)} tok`;

// Stage costs are often fractions of a cent: show enough digits to be honest about them.
export const formatUsd = (usd: number) => {
  if (usd === 0) return '$0';
  if (usd < 0.0001) return '< $0.0001';
  return `$${usd.toFixed(usd < 0.01 ? 4 : 2)}`;
};

export const formatNumber = (value: number, digits = 3) => value.toFixed(digits);

export const pad2 = (n: number) => String(n).padStart(2, '0');
