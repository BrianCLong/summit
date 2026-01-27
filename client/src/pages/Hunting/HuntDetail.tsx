import React from 'react';
import { Card, CardContent, Typography, Chip, Stack, Box } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSafeQuery } from '../../hooks/useSafeQuery';
import { ArrowBack } from '@mui/icons-material';
import { IconButton } from '@mui/material';

interface HuntDetail {
  id: string;
  name: string;
  status: 'RUNNING' | 'SCHEDULED' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  type: 'IOC' | 'BEHAVIORAL' | 'NETWORK' | 'FINANCIAL' | 'MITRE_ATT&CK';
  tactic: string;
  lastRun: string;
  findings: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
}

export default function HuntDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useSafeQuery<HuntDetail>({
    queryKey: `hunt_${id}`,
    mock: {
      id: id || 'hunt1',
      name: 'Sample Hunt',
      status: 'COMPLETED',
      type: 'IOC',
      tactic: 'Initial Access',
      lastRun: new Date().toISOString(),
      findings: 5,
      severity: 'HIGH',
      description: 'A sample threat hunting operation.',
    },
    deps: [id],
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'primary';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'SCHEDULED':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/hunts')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5">Hunt Details</Typography>
      </Stack>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {data?.name}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label={data?.status}
              color={getStatusColor(data?.status || '') as 'default'}
              size="small"
            />
            <Chip
              label={data?.severity}
              color={getSeverityColor(data?.severity || '') as 'default'}
              size="small"
            />
            <Chip label={data?.type} variant="outlined" size="small" />
          </Stack>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {data?.description}
          </Typography>
          <Typography variant="body2">
            <strong>Tactic:</strong> {data?.tactic}
          </Typography>
          <Typography variant="body2">
            <strong>Findings:</strong> {data?.findings}
          </Typography>
          <Typography variant="body2">
            <strong>Last Run:</strong>{' '}
            {data?.lastRun ? new Date(data.lastRun).toLocaleString() : 'N/A'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
