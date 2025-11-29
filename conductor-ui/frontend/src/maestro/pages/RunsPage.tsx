import React, { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Box,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Run } from '../types';

export const RunsPage: React.FC = () => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const data = await api.runs.list();
      setRuns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Runs</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Run ID</TableCell>
              <TableCell>Pipeline</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Started At</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id} hover>
                <TableCell>{run.id.substring(0, 8)}...</TableCell>
                <TableCell>{run.pipeline}</TableCell>
                <TableCell>
                  <StatusChip status={run.status} />
                </TableCell>
                <TableCell>{new Date(run.started_at).toLocaleString()}</TableCell>
                <TableCell>{run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '-'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => navigate(`/maestro/runs/${run.id}`)}>
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {runs.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} align="center">No runs found</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const StatusChip = ({ status }: { status: string }) => {
  let color: any = 'default';
  if (status === 'succeeded') color = 'success';
  if (status === 'failed') color = 'error';
  if (status === 'running') color = 'primary';
  if (status === 'queued') color = 'warning';

  return <Chip label={status} color={color} size="small" />;
};
