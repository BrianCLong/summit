import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useSafeQuery } from '../../hooks/useSafeQuery';

export default function IOCDetail() {
  const { id } = useParams();
  const { data } = useSafeQuery<{
    id: string;
    type: string;
    value: string;
    lastSeen: string;
  }>({
    queryKey: `ioc_${id}`,
    mock: {
      id: id || 'ioc1',
      type: 'ip',
      value: '1.2.3.4',
      lastSeen: new Date().toISOString(),
    },
    deps: [id],
  });
  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6">IOC — {data?.id}</Typography>
        <Typography>Type: {data?.type}</Typography>
        <Typography>Value: {data?.value}</Typography>
        <Typography>
          Last Seen: {new Date(data?.lastSeen || Date.now()).toLocaleString()}
        </Typography>
      </CardContent>
    </Card>
  );
}
