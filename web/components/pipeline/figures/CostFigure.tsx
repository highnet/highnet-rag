import { COPY } from '@/content/copy';
import { formatUsd } from '@/lib/format';
import type { GenerateData } from '@/lib/stage-data';

import { Bar } from './Bar';
import { Figure } from './Figure';
import { Legend } from './WindowFigure';

type CostFigureProps = { data: GenerateData };

const F = COPY.figures.cost;

// The answer's cost split into reading (input tokens) and writing (output tokens).
const CostFigure = ({ data }: CostFigureProps) => {
  const { input_usd: input, output_usd: output } = data.cost_split;
  return (
    <Figure caption={F.caption} alt={F.alt(formatUsd(input), formatUsd(output))}>
      <Bar
        max={Math.max(input + output, 1e-9)}
        segments={[
          { key: 'input', value: input, tone: 'pencil' },
          { key: 'output', value: output, tone: 'ink' },
        ]}
      />
      <Legend
        items={[
          { tone: 'pencil', label: F.input, value: formatUsd(input) },
          { tone: 'ink', label: F.output, value: formatUsd(output) },
        ]}
      />
    </Figure>
  );
};

export { CostFigure };
