import { Typography } from '@/components/ui/Typography';

type SkippedViewProps = { reason: string };

const SkippedView = ({ reason }: SkippedViewProps) => {
  return (
    <Typography variant="small" color="muted">
      {reason}
    </Typography>
  );
};

export { SkippedView };
