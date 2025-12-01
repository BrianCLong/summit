import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import { Science } from '@mui/icons-material';
import { api } from '../api';
import { Experiment } from '../types';

export const ExperimentsPage: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.experiments.list();
      setExperiments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Experiments Lab</Typography>
      <Grid container spacing={3}>
         {experiments.map(exp => (
             <Grid item xs={12} md={6} key={exp.id}>
                 <Card>
                     <CardContent>
                         <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                             <Science color="secondary" sx={{ mr: 2 }} />
                             <Box>
                                 <Typography variant="h6">{exp.name}</Typography>
                                 <Typography variant="caption" color="textSecondary">{exp.id}</Typography>
                             </Box>
                             <Box sx={{ flexGrow: 1 }} />
                             <Chip label={exp.status} color={exp.status === 'running' ? 'success' : 'default'} />
                         </Box>
                         <Typography variant="body1" gutterBottom>{exp.hypothesis}</Typography>

                         <Box sx={{ mt: 2, bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                             <Typography variant="subtitle2">Results so far:</Typography>
                             {Object.entries(exp.metrics).map(([key, val]) => (
                                 <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                     <Typography variant="body2">{key}</Typography>
                                     <Typography
                                        variant="body2"
                                        fontWeight="bold"
                                        color={Number(val) > 0 ? 'success.main' : 'error.main'}
                                     >
                                         {Number(val) > 0 ? '+' : ''}{val}%
                                     </Typography>
                                 </Box>
                             ))}
                         </Box>
                     </CardContent>
                 </Card>
             </Grid>
         ))}
      </Grid>
    </Box>
  );
};
