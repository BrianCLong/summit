import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useSafeQuery } from '../../hooks/useSafeQuery';

export default function HuntRun() {
  const { id } = useParams();
  const { data } = useSafeQuery<{
    id: string;
    status: string;
    detections: number;
  }>({
    queryKey: `hunt_${id}`,
    mock: { id: id || 'h1', status: 'SUCCESS', detections: 12 },
    deps: [id],
  });

  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Hunt Run — {data?.id}</Typography>
          <Chip
            size="small"
            label={data?.status}
            color={data?.status === 'RUNNING' ? 'warning' : 'success'}
          />
        </Stack>
        <Typography sx={{ mt: 2 }}>
          Detections correlated: {data?.detections}
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained">
          Re-run
        </Button>
      </CardContent>
    </Card>
  );
}
