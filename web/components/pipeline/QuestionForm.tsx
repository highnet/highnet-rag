'use client';

import { type FormEvent, useState } from 'react';
import { CornerDownLeft, Square } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { COPY } from '@/content/copy';

type QuestionFormProps = {
  running: boolean;
  disabled: boolean;
  maxLength: number;
  onRun: (question: string) => void;
  onStop: () => void;
};

const QuestionForm = ({ running, disabled, maxLength, onRun, onStop }: QuestionFormProps) => {
  const [question, setQuestion] = useState('');

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
          <Button type="button" variant="quiet" onClick={onStop} className="px-3 sm:w-28">
            <Square aria-hidden />
            {COPY.stop}
          </Button>
        ) : (
          <Button type="submit" disabled={disabled || !question.trim()} className="px-3 sm:w-28">
            <CornerDownLeft aria-hidden />
            {COPY.run}
          </Button>
        )}
      </form>
      <div className="space-y-1">
        <Typography variant="small" color="muted" as="p">
          {COPY.tryLabel}
        </Typography>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {COPY.suggestions.map((s, i) => (
            <li key={s} className="flex flex-wrap items-baseline gap-x-2">
              <Button
                type="button"
                variant="pencil"
                size="inline"
                className="min-h-8 text-left whitespace-normal"
                disabled={disabled || running}
                onClick={() => ask(s)}
              >
                {s}
              </Button>
              {i === COPY.suggestions.length - 1 && (
                <Typography variant="small" color="muted" as="span">
                  {COPY.suggestionNote}
                </Typography>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export { QuestionForm };
