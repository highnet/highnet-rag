'use client';

import { type FormEvent, useState } from 'react';
import { ChevronDown, CornerDownLeft, Square } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';
import { cn } from '@/lib/utils';

type QuestionFormProps = {
  initialQuestion?: string;
  suggestions?: readonly string[];
  suggestionsLabel?: string;
  lastNote?: string;
  running: boolean;
  disabled: boolean;
  maxLength: number;
  onRun: (question: string) => void;
  onStop: () => void;
};

const QuestionForm = ({
  initialQuestion = '',
  suggestions = COPY.suggestions,
  suggestionsLabel = COPY.tryLabel,
  lastNote,
  running,
  disabled,
  maxLength,
  onRun,
  onStop,
}: QuestionFormProps) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [showAll, setShowAll] = useState(false);
  // Long lists (agentic mode) show three and fold the rest, so the page stays short on phones.
  const folded = suggestions.length > 4 && !showAll;
  const shown = folded ? suggestions.slice(0, 3) : suggestions;
  const hidden = suggestions.length > 4 ? suggestions.length - 3 : 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = question.trim();
    if (q) onRun(q);
  };

  const ask = (q: string) => {
    setQuestion(q);
    onRun(q);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2" role="search">
        <label htmlFor="question" className="sr-only">
          {COPY.questionLabel}
        </label>
        <Input
          id="question"
          name="q"
          value={question}
          maxLength={maxLength}
          autoComplete="off"
          placeholder={COPY.questionPlaceholder}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={disabled}
          className="flex-1"
        />
        {running ? (
          <Button
            type="button"
            variant="quiet"
            onClick={onStop}
            aria-label={COPY.stop}
            className="w-11 px-0 sm:w-28 sm:px-4"
          >
            <Square aria-hidden />
            <span className="hidden sm:inline">{COPY.stop}</span>
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={disabled || !question.trim()}
            aria-label={COPY.run}
            className="w-11 px-0 sm:w-28 sm:px-4"
          >
            <CornerDownLeft aria-hidden />
            <span className="hidden sm:inline">{COPY.run}</span>
          </Button>
        )}
      </form>
      <div className="space-y-0.5">
        <Typography variant="small" color="muted" as="p">
          {suggestionsLabel}
        </Typography>
        <ul className="grid gap-x-6 gap-y-2 py-1 sm:grid-cols-2">
          {shown.map((s, i) => (
            <li key={s}>
              <Button
                type="button"
                variant="pencil"
                size="inline"
                className="inline min-h-8 text-left leading-snug whitespace-normal"
                disabled={disabled || running}
                onClick={() => ask(s)}
              >
                {s}
              </Button>
              {lastNote && i === shown.length - 1 && (
                <span className="ml-2 text-sm text-muted-foreground">{lastNote}</span>
              )}
            </li>
          ))}
        </ul>
        {hidden > 0 && (
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
            {showAll ? COPY.fewerSuggestions : COPY.moreSuggestions(hidden)}
          </Button>
        )}
      </div>
    </div>
  );
};

export { QuestionForm };
