import { Stack, Typography, Chip } from '@mui/material';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

function formatRange(range: [number, number] | null) {
  if (!range) return 'Unbounded';
  const [start, end] = range;
  const formatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function SelectionSummary() {
  const { selectedNodeId, timeRange } = useSelector(
    (state: RootState) => state.selection,
  );
  const rangeText = useMemo(() => formatRange(timeRange), [timeRange]);

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      data-testid="selection-summary"
      aria-label="selection summary"
    >
      <Typography variant="body2">
        Selected node:{' '}
        <Chip
          label={selectedNodeId ?? 'None'}
          color={selectedNodeId ? 'primary' : 'default'}
          size="small"
          variant={selectedNodeId ? 'filled' : 'outlined'}
          data-testid="selected-node-label"
        />
      </Typography>
      <Typography variant="body2">
        Time range:{' '}
        <Chip
          label={rangeText}
          size="small"
          variant="outlined"
          data-testid="time-range-label"
        />
      </Typography>
    </Stack>
  );
}
