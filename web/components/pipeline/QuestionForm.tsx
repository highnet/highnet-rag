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
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" role="search">
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
          className="sm:flex-1"
        />
        {running ? (
          <Button type="button" variant="quiet" onClick={onStop} className="sm:w-28">
            <Square aria-hidden />
            {COPY.stop}
          </Button>
        ) : (
          <Button type="submit" disabled={disabled || !question.trim()} className="sm:w-28">
            <CornerDownLeft aria-hidden />
            {COPY.run}
          </Button>
        )}
      </form>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Typography variant="small" color="muted" as="span">
          {COPY.tryLabel}
        </Typography>
        {COPY.suggestions.map((s) => (
          <Button
            key={s}
            type="button"
            variant="pencil"
            size="inline"
            className="min-h-8 text-left whitespace-normal"
            disabled={disabled || running}
            onClick={() => ask(s)}
          >
            {s}
          </Button>
        ))}
      </div>
      <Typography variant="small" color="muted">
        {COPY.suggestionNote}
      </Typography>
    </div>
  );
};

export { QuestionForm };
