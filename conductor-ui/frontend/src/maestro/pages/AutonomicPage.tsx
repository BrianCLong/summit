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
  Switch,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { api } from '../api';
import { AutonomicLoop } from '../types';

export const AutonomicPage: React.FC = () => {
  const [loops, setLoops] = useState<AutonomicLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLoops();
  }, []);

  const loadLoops = async () => {
    try {
      const data = await api.autonomic.listLoops();
      setLoops(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    try {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        await api.autonomic.toggleLoop(id, newStatus);
        setLoops(loops.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch (err: any) {
        setError(err.message || 'Failed to toggle loop');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Autonomic Nervous System</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Loop Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Decision</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell>Control</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loops.map((loop) => (
              <TableRow key={loop.id}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  {loop.name}
                </TableCell>
                <TableCell>{loop.type.toUpperCase()}</TableCell>
                <TableCell>
                    <Box sx={{ color: loop.status === 'active' ? 'green' : 'gray' }}>
                        {loop.status.toUpperCase()}
                    </Box>
                </TableCell>
                <TableCell>{loop.lastDecision}</TableCell>
                <TableCell>{new Date(loop.lastRun).toLocaleString()}</TableCell>
                <TableCell>
                  <Switch
                    checked={loop.status === 'active'}
                    onChange={() => handleToggle(loop.id, loop.status)}
                    color="primary"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
