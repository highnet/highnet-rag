'use client';

import { useState } from 'react';
import { ChevronDown, Square } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import type { DemoQuestion } from '@/lib/api';
import { cn } from '@/lib/utils';

const R = COPY.replay;

type QuestionGroupProps = {
  label: string;
  questions: DemoQuestion[];
  selectedId: string | null;
  disabled: boolean;
  onPick: (question: DemoQuestion) => void;
};

// Long groups show three and fold the rest, so the page stays short on phones.
const QuestionGroup = ({ label, questions, selectedId, disabled, onPick }: QuestionGroupProps) => {
  const [showAll, setShowAll] = useState(false);
  const selectedAt = questions.findIndex((q) => q.id === selectedId);
  const folded = questions.length > 4 && !showAll && selectedAt < 3;
  const shown = folded ? questions.slice(0, 3) : questions;
  const hidden = questions.length > 4 ? questions.length - 3 : 0;
  return (
    <div className="space-y-1.5">
      <Typography variant="label" color="muted" as="h3">
        {label}
      </Typography>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((q) => (
          <li key={q.id}>
            <Button
              type="button"
              variant="quiet"
              aria-pressed={q.id === selectedId}
              disabled={disabled}
              onClick={() => onPick(q)}
              className="h-auto min-h-11 w-full justify-start py-2 text-left leading-snug font-normal whitespace-normal"
            >
              {q.question}
            </Button>
          </li>
        ))}
      </ul>
      {hidden > 0 && selectedAt < 3 && (
        <Button
          type="button"
          variant="pencil"
          size="inline"
          aria-expanded={showAll}
          className="min-h-8 gap-1 text-sm"
          onClick={() => setShowAll((open) => !open)}
        >
          <ChevronDown
            aria-hidden
            className={cn('transition-transform', showAll && 'rotate-180')}
          />
          {showAll ? R.fewer : R.more(hidden)}
        </Button>
      )}
    </div>
  );
};

type QuestionPickerProps = {
  questions: DemoQuestion[];
  selectedId: string | null;
  running: boolean;
  onPick: (question: DemoQuestion) => void;
  onStop: () => void;
};

// The recorded questions, in place of a free-text box: picking one replays its recorded run.
const QuestionPicker = ({
  questions,
  selectedId,
  running,
  onPick,
  onStop,
}: QuestionPickerProps) => {
  const single = questions.filter((q) => !q.compound);
  const compound = questions.filter((q) => q.compound);
  return (
    <section aria-labelledby="pick-label" className="space-y-3">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <Typography variant="stepHeading" as="h2" id="pick-label" className="text-base">
          {R.pickLabel}
        </Typography>
        {running && (
          <Button type="button" variant="quiet" size="sm" onClick={onStop}>
            <Square aria-hidden />
            {COPY.stop}
          </Button>
        )}
      </div>
      {questions.length === 0 && (
        <Typography variant="small" color="muted">
          {R.empty}
        </Typography>
      )}
      {single.length > 0 && (
        <QuestionGroup
          label={R.single}
          questions={single}
          selectedId={selectedId}
          disabled={running}
          onPick={onPick}
        />
      )}
      {compound.length > 0 && (
        <QuestionGroup
          label={R.compound}
          questions={compound}
          selectedId={selectedId}
          disabled={running}
          onPick={onPick}
        />
      )}
    </section>
  );
};

export { QuestionPicker };
