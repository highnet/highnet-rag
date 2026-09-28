'use client';

import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { ApiConfig } from '@/lib/api';

type SettingsStripProps = {
  config: ApiConfig;
  k: number;
  chunkSet: string;
  disabled: boolean;
  onK: (k: number) => void;
};

// Only settings that change something in this build are shown; more join per milestone.
const SettingsStrip = ({ config, k, chunkSet, disabled, onK }: SettingsStripProps) => {
  const set = config.chunk_sets.find((s) => s.name === chunkSet);
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-dashed py-3">
      <div className="flex items-center gap-3">
        <Typography variant="small" color="muted" as="span" id="topk-label">
          {COPY.settings.topK}
        </Typography>
        <div role="group" aria-labelledby="topk-label" className="flex items-center gap-1">
          <Button
            variant="quiet"
            size="icon"
            aria-label={COPY.settings.fewer}
            disabled={disabled || k <= 1}
            onClick={() => onK(k - 1)}
          >
            <Minus aria-hidden />
          </Button>
          <output aria-live="polite" className="voice-data w-8 text-center text-base">
            {k}
          </output>
          <Button
            variant="quiet"
            size="icon"
            aria-label={COPY.settings.more}
            disabled={disabled || k >= config.top_k.max}
            onClick={() => onK(k + 1)}
          >
            <Plus aria-hidden />
          </Button>
        </div>
      </div>
      <p className="text-sm">
        <span className="text-muted-foreground">{COPY.settings.search} </span>
        <span className="voice-data">{config.modes.join(', ')}</span>
      </p>
      {set && (
        <p className="text-sm">
          <span className="text-muted-foreground">{COPY.settings.chunks} </span>
          <span className="voice-data">
            {set.name} · ~{set.target_tokens} tok · {set.chunks.toLocaleString('en')} chunks
          </span>
        </p>
      )}
    </div>
  );
};

export { SettingsStrip };
