import { Typography } from '@/components/ui/Typography';
import { EVALS } from '@/content/evals';

// A section the run skipped: said plainly, never filled with a guess.
const NotMeasured = () => {
  return (
    <div data-slot="not-measured" className="rounded-sm border border-dashed px-4 py-3">
      <Typography variant="label" color="muted" as="p">
        {EVALS.notMeasured.label}
      </Typography>
      <Typography variant="small" color="muted" className="mt-1 max-w-[68ch]">
        {EVALS.notMeasured.body}
      </Typography>
    </div>
  );
};

export { NotMeasured };
