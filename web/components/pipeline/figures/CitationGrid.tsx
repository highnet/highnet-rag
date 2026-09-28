import { Check } from 'lucide-react';

import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { CitationsData } from '@/lib/stage-data';
import { cn } from '@/lib/utils';

type CitationGridProps = { data: CitationsData; passages: number };

const F = COPY.figures.citations;

// Answer text down the side, passages across the top, a pencil tick where a part of the
// answer cites a passage. A real table, so it reads cell by cell without the picture.
const CitationGrid = ({ data, passages }: CitationGridProps) => {
  const blocks = data.blocks.filter((b) => b.text.trim());
  const ranks = Array.from({ length: passages }, (_, i) => i + 1);
  const used = new Set(blocks.flatMap((b) => b.citation_ids));
  return (
    <figure className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="voice-data border-b text-xs text-muted-foreground">
              <th scope="col" className="py-1.5 pr-3 text-left font-medium">
                {F.sentence}
              </th>
              {ranks.map((rank) => (
                <th
                  key={rank}
                  scope="col"
                  className={cn(
                    'w-7 py-1.5 text-center font-medium',
                    used.has(rank) ? 'text-primary' : 'line-through',
                  )}
                >
                  [{rank}]{!used.has(rank) && <span className="sr-only"> ({F.unused})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blocks.map((block, i) => (
              <tr key={i} className="border-b border-dashed">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                  <span className="line-clamp-2 max-w-[48ch]">{block.text.trim()}</span>
                </th>
                {ranks.map((rank) => (
                  <td key={rank} className="text-center">
                    {block.citation_ids.includes(rank) ? (
                      <>
                        <Check aria-hidden className="inline size-4 text-primary" />
                        <span className="sr-only">{F.cited}</span>
                      </>
                    ) : (
                      <span className="sr-only">{F.notCited}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Typography as="figcaption" variant="small" color="muted" className="max-w-[68ch]">
        {F.caption}
      </Typography>
    </figure>
  );
};

export { CitationGrid };
