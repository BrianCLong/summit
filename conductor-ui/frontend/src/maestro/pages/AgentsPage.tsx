import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Avatar,
  CircularProgress
} from '@mui/material';
import { SmartToy } from '@mui/icons-material';
import { api } from '../api';
import { AgentProfile } from '../types';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await api.agents.list();
      setAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Agent Fleet</Typography>
      <Grid container spacing={3}>
        {agents.map((agent) => (
          <Grid item xs={12} sm={6} md={4} key={agent.id}>
             <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                            <SmartToy />
                        </Avatar>
                        <Box>
                            <Typography variant="h6">{agent.name}</Typography>
                            <Typography variant="caption" color="textSecondary">{agent.role}</Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip
                            label={agent.status}
                            color={agent.status === 'healthy' ? 'success' : 'warning'}
                            size="small"
                        />
                    </Box>

                    <Typography variant="body2" gutterBottom>Model: {agent.model}</Typography>

                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">Success Rate</Typography>
                            <Typography variant="caption">{agent.metrics.successRate}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={agent.metrics.successRate} color="success" />
                    </Box>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                         <Typography variant="caption">P95 Latency: {agent.metrics.latencyP95}ms</Typography>
                         <Typography variant="caption">Weight: {agent.routingWeight}</Typography>
                    </Box>
                </CardContent>
             </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
