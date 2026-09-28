import { type ReactNode } from 'react';

import { Typography } from '@/components/ui/Typography';

type EvalSectionProps = {
  id: string;
  title: string;
  notes: string[];
  children: ReactNode;
};

// One sheet of the report, with its blue-pencil note: in the margin from lg, above the working
// below it, the same way a pipeline step carries its note.
const EvalSection = ({ id, title, notes, children }: EvalSectionProps) => {
  const headingId = `${id}-title`;
  const note = notes.map((text) => (
    <Typography key={text} variant="marginNote" className="max-w-[68ch]">
      {text}
    </Typography>
  ));
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="grid scroll-mt-6 items-start gap-y-3 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-x-8"
    >
      <div className="min-w-0 rounded-md border bg-card px-4 py-4 md:px-5">
        <Typography variant="stepHeading" as="h2" id={headingId}>
          {title}
        </Typography>
        <div className="mt-2 space-y-2 lg:hidden">{note}</div>
        <div className="mt-4">{children}</div>
      </div>
      <aside className="hidden space-y-2 pt-4 lg:block">{note}</aside>
    </section>
  );
};

export { EvalSection };
