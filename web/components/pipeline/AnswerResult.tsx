import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { formatMs, formatTokens, formatUsd } from '@/lib/format';
import type { RunDone } from '@/lib/generated/trace';
import type { CitationsData } from '@/lib/stage-data';

type AnswerResultProps = {
  citations: CitationsData;
  done: RunDone | null;
};

// The last line of the calculation: the answer, with each claim tied to its passage.
const AnswerResult = ({ citations, done }: AnswerResultProps) => {
  const sources = new Map(citations.citations.map((c) => [c.rank, c]));
  return (
    <section
      aria-labelledby="result-title"
      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-x-4 lg:grid-cols-[3rem_minmax(0,1fr)_17rem] lg:gap-x-8"
    >
      <span aria-hidden className="voice-data pt-5 text-right text-base text-primary">
        =
      </span>
      <div className="min-w-0 animate-write-in rounded-md border border-foreground/70 bg-card px-4 py-5 md:px-6">
        <Typography variant="label" color="muted" as="h2" id="result-title">
          {COPY.resultLabel}
        </Typography>
        <p className="mt-2 max-w-[68ch] text-lg leading-relaxed text-pretty">
          {citations.blocks.map((block, i) => (
            <span key={i}>
              {block.text}
              {block.citation_ids.map((rank) => (
                <a
                  key={rank}
                  href={`#chunk-${sources.get(rank)?.chunk_id ?? ''}`}
                  aria-label={`Source ${rank}`}
                  className="voice-data ml-0.5 align-super text-xs text-primary hover:underline"
                >
                  [{rank}]
                </a>
              ))}
            </span>
          ))}
        </p>
        {sources.size > 0 && (
          <div className="mt-4 border-t border-dashed pt-3">
            <Typography variant="label" color="muted" as="h3">
              {COPY.sourcesLabel}
            </Typography>
            <ul className="mt-1.5 space-y-1 text-sm">
              {[...sources.values()].map((s) => (
                <li key={s.rank}>
                  <a href={`#chunk-${s.chunk_id}`} className="hover:text-primary hover:underline">
                    <span className="voice-data mr-2 text-primary">[{s.rank}]</span>
                    {s.doc_title}
                    <span className="voice-data ml-2 text-xs text-muted-foreground">
                      #{s.chunk_id}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {done && (
          <p className="voice-data mt-4 text-xs text-muted-foreground">
            {COPY.totals} · {formatMs(done.ms)} · {formatTokens(done.tokens)} ·{' '}
            {formatUsd(done.cost_usd)} · {done.stages} steps
          </p>
        )}
      </div>
    </section>
  );
};

export { AnswerResult };
