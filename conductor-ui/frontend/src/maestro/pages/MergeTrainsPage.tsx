import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress
} from '@mui/material';
import { Train, GitHub } from '@mui/icons-material';
import { api } from '../api';
import { MergeTrain } from '../types';

export const MergeTrainsPage: React.FC = () => {
  const [train, setTrain] = useState<MergeTrain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.mergeTrain.getStatus();
      setTrain(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (!train) return <Typography>No active merge train.</Typography>;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Merge Train Operations</Typography>
      <Grid container spacing={3}>
         <Grid item xs={12} md={4}>
             <Paper sx={{ p: 3, textAlign: 'center' }}>
                 <Train sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                 <Typography variant="h5" gutterBottom>Comet Express</Typography>
                 <Chip label={train.status} color={train.status === 'active' ? 'success' : 'default'} />
                 <Box sx={{ mt: 3 }}>
                     <Typography variant="h3">{train.queueLength}</Typography>
                     <Typography color="textSecondary">PRs in Queue</Typography>
                 </Box>
                 <Box sx={{ mt: 2 }}>
                     <Typography variant="h6">{train.throughput}/day</Typography>
                     <Typography color="textSecondary">Throughput</Typography>
                 </Box>
             </Paper>
         </Grid>
         <Grid item xs={12} md={8}>
             <Paper sx={{ p: 3 }}>
                 <Typography variant="h6" gutterBottom>Active Queue</Typography>
                 <List>
                     {train.activePRs.map((pr) => (
                         <ListItem key={pr.number} divider>
                             <ListItemIcon><GitHub /></ListItemIcon>
                             <ListItemText
                                primary={`#${pr.number} ${pr.title}`}
                                secondary={`by ${pr.author}`}
                             />
                             <Chip
                                label={pr.status}
                                size="small"
                                color={pr.status === 'running' ? 'primary' : 'default'}
                             />
                         </ListItem>
                     ))}
                 </List>
             </Paper>
         </Grid>
      </Grid>
    </Box>
  );
};
