import { COPY } from '@/content/copy';
import { cn } from '@/lib/utils';
import type { PromptData } from '@/lib/stage-data';

import { Bar } from './Bar';
import { Figure } from './Figure';

type WindowFigureProps = { data: PromptData };

const F = COPY.figures.window;

type LegendItem = {
  tone: 'pencil' | 'neutral' | 'soft' | 'ink' | 'muted';
  label: string;
  value: string;
};

type LegendProps = { items: LegendItem[] };

const SWATCH: Record<LegendItem['tone'], string> = {
  pencil: 'bg-primary',
  neutral: 'bg-chart-5',
  soft: 'bg-chart-5/35',
  ink: 'bg-foreground',
  muted: 'bg-muted',
};

const Legend = ({ items }: LegendProps) => {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden className={cn('size-2.5 border border-input', SWATCH[item.tone])} />
          {item.label} <span className="voice-data text-foreground">{item.value}</span>
        </li>
      ))}
    </ul>
  );
};

// How much of the model's context window this request fills, and what the input is made of.
const WindowFigure = ({ data }: WindowFigureProps) => {
  const window = data.context_window;
  const parts = data.parts_approx;
  const share = window ? (data.input_tokens / window) * 100 : null;
  const shareText = share === null ? '' : share < 0.1 ? '<0.1%' : `${share.toFixed(1)}%`;
  return (
    <Figure
      caption={window ? F.caption : F.captionNoWindow}
      alt={F.alt(
        data.input_tokens.toLocaleString('en'),
        window ? `, ${F.share(shareText)} of ${window.toLocaleString('en')}` : '',
      )}
    >
      {window ? (
        <div className="space-y-1.5">
          <Bar
            max={window}
            segments={[
              { key: 'input', value: data.input_tokens, tone: 'pencil' },
              { key: 'reserved', value: data.max_tokens, tone: 'soft' },
            ]}
          />
          <Legend
            items={[
              { tone: 'pencil', label: F.used, value: data.input_tokens.toLocaleString('en') },
              { tone: 'soft', label: F.reserved, value: data.max_tokens.toLocaleString('en') },
              {
                tone: 'muted',
                label: F.window(window.toLocaleString('en')),
                value: F.share(shareText),
              },
            ]}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{F.noWindow}</p>
      )}
      <div className={cn('space-y-1.5', window && 'border-t border-dashed pt-2')}>
        <Bar
          max={parts.system + parts.passages + parts.question}
          segments={[
            { key: 'system', value: parts.system, tone: 'neutral' },
            { key: 'passages', value: parts.passages, tone: 'pencil' },
            { key: 'question', value: parts.question, tone: 'ink' },
          ]}
        />
        <Legend
          items={[
            {
              tone: 'neutral',
              label: F.parts.system,
              value: `~${parts.system.toLocaleString('en')}`,
            },
            {
              tone: 'pencil',
              label: F.parts.passages,
              value: `~${parts.passages.toLocaleString('en')}`,
            },
            {
              tone: 'ink',
              label: F.parts.question,
              value: `~${parts.question.toLocaleString('en')}`,
            },
          ]}
        />
      </div>
    </Figure>
  );
};

export { Legend, WindowFigure };
