// Same origin in production (FastAPI serves the export). In `next dev`, point at uvicorn.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export type ApiConfig = {
  modes: string[];
  top_k: { default: number; max: number };
  chunk_sets: { name: string; target_tokens: number; chunks: number }[];
  models: {
    embed: { provider: string; model: string };
    answer: { provider: string; model: string };
  };
  illustrative: boolean;
  budget: { spent_usd: number; cap_usd: number; remaining_usd: number; tier: BudgetTier };
  corpus: Record<string, string>;
  max_query_chars: number;
};

export type BudgetTier = 'normal' | 'degraded' | 'stopped';

export const fetchConfig = async (signal?: AbortSignal): Promise<ApiConfig> => {
  const response = await fetch(apiUrl('/api/config'), { signal });
  if (!response.ok) {
    throw new Error(`The API answered ${response.status}.`);
  }
  return (await response.json()) as ApiConfig;
};
