import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { CitationsData } from '@/lib/stage-data';

import { CitationGrid } from '../figures/CitationGrid';

type CitationsViewProps = { data: CitationsData; passages: number };

const CitationsView = ({ data, passages }: CitationsViewProps) => {
  return (
    <div className="space-y-3">
      {data.abstained && <Typography color="success">{COPY.abstained}</Typography>}
      {!data.abstained && data.citations.length === 0 && (
        <Typography color="warning">{COPY.noCitations}</Typography>
      )}
      {data.citations.length > 0 && passages > 0 && (
        <CitationGrid data={data} passages={passages} />
      )}
      {data.citations.length > 0 && (
        <ul className="space-y-2">
          {data.citations.map((c, i) => (
            <li key={`${c.chunk_id}-${i}`} className="text-sm">
              <a
                href={`#chunk-${c.chunk_id}`}
                className="voice-data mr-2 text-primary hover:underline"
              >
                [{c.rank}]
              </a>
              <q className="text-muted-foreground">{c.cited_text}</q>
            </li>
          ))}
        </ul>
      )}
      {data.unused_chunk_ids.length > 0 && (
        <Typography variant="small" color="muted">
          {COPY.unused(data.unused_chunk_ids.length)}
        </Typography>
      )}
    </div>
  );
};

export { CitationsView };
