'use client';

import { ChevronDown, Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { ApiConfig } from '@/lib/api';
import type { RunSettings } from '@/lib/url-state';

type SettingsStripProps = {
  config: ApiConfig;
  settings: RunSettings;
  disabled: boolean;
  stale: boolean;
  onChange: (settings: RunSettings) => void;
};

const S = COPY.settings;

// Only settings that change something in this build are shown; more join per milestone.
const SettingsStrip = ({ config, settings, disabled, stale, onChange }: SettingsStripProps) => {
  const { mode, k, chunkSet } = settings;
  const set = config.chunk_sets.find((s) => s.name === chunkSet);
  const modeLabel = S.modes[mode]?.label ?? mode;

  // Phones: a one-line summary that opens the controls. From sm up the strip is always open.
  return (
    <Collapsible className="border-y border-dashed">
      <CollapsibleTrigger className="group flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-sm sm:hidden">
        <span>
          <span className="text-muted-foreground">{S.summary} </span>
          <span className="voice-data">
            {modeLabel} · k={k} · {chunkSet}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 text-primary transition-transform group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        forceMount
        className="flex flex-col gap-y-4 pb-4 data-[state=closed]:hidden sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-8 sm:py-3 sm:data-[state=closed]:flex"
      >
        <div className="space-y-1.5">
          <Typography variant="small" color="muted" as="span" id="mode-label" className="block">
            {S.search}
          </Typography>
          <SegmentedControl
            name="mode"
            labelledBy="mode-label"
            value={mode}
            disabled={disabled}
            onChange={(value) => onChange({ ...settings, mode: value })}
            options={config.modes.map((m) => ({
              value: m,
              label: S.modes[m]?.label ?? m,
              description: S.modes[m]?.description,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <Typography variant="small" color="muted" as="span" id="topk-label" className="block">
            {S.topK}
          </Typography>
          <div role="group" aria-labelledby="topk-label" className="flex items-center gap-1">
            <Button
              variant="quiet"
              size="icon"
              aria-label={S.fewer}
              disabled={disabled || k <= 1}
              onClick={() => onChange({ ...settings, k: k - 1 })}
            >
              <Minus aria-hidden />
            </Button>
            <output aria-live="polite" className="voice-data w-8 text-center text-base">
              {k}
            </output>
            <Button
              variant="quiet"
              size="icon"
              aria-label={S.more}
              disabled={disabled || k >= config.top_k.max}
              onClick={() => onChange({ ...settings, k: k + 1 })}
            >
              <Plus aria-hidden />
            </Button>
          </div>
        </div>

        {config.chunk_sets.length > 0 && (
          <div className="space-y-1.5">
            <Typography variant="small" color="muted" as="span" id="chunks-label" className="block">
              {S.chunks}
              {set && (
                <span className="voice-data ml-2 text-xs">
                  {S.chunkSize(set.target_tokens, set.chunks)}
                </span>
              )}
            </Typography>
            <SegmentedControl
              name="chunks"
              labelledBy="chunks-label"
              value={chunkSet}
              disabled={disabled}
              onChange={(value) => onChange({ ...settings, chunkSet: value })}
              options={config.chunk_sets.map((s) => ({
                value: s.name,
                label: s.name,
                description: S.chunkSize(s.target_tokens, s.chunks),
              }))}
            />
          </div>
        )}

        {stale && (
          <Typography variant="marginNote" className="sm:basis-full">
            {S.changed}
          </Typography>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export { SettingsStrip };
