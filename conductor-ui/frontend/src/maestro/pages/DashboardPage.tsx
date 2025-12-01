import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Alert as MuiAlert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../api';
import { DashboardData } from '../types';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.dashboard.get();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error) return <MuiAlert severity="error">{error}</MuiAlert>;
  if (!data) return null;

  const { health, stats, autonomic } = data;

  // Mock trend data for charts
  const runTrend = [
    { time: '10:00', runs: 12 },
    { time: '11:00', runs: 18 },
    { time: '12:00', runs: 15 },
    { time: '13:00', runs: 25 },
    { time: '14:00', runs: 30 },
    { time: '15:00', runs: activeRunsCount(stats) },
  ];

  function activeRunsCount(s: any) {
    return s.activeRuns; // Just helper
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Control Room</Typography>
        <IconButton onClick={fetchData}><Refresh /></IconButton>
      </Box>

      {/* Top Level Health */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%', bgcolor: getHealthColor(health.overallScore) }}>
            <Typography variant="h6" color="white">System Health</Typography>
            <Typography variant="h2" fontWeight="bold" color="white">{health.overallScore}%</Typography>
            <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
              {health.overallScore > 90 ? 'Operational' : 'Degraded'}
            </Typography>
          </Paper>
        </Grid>

        {health.workstreams.map((ws) => (
          <Grid item xs={12} sm={6} md={3} key={ws.name}>
             <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography color="textSecondary" gutterBottom>{ws.name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h5">{ws.status.toUpperCase()}</Typography>
                        <Chip
                            label={`${ws.score}%`}
                            color={ws.score > 90 ? 'success' : ws.score > 70 ? 'warning' : 'error'}
                        />
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={ws.score}
                        sx={{ mt: 2 }}
                        color={ws.score > 90 ? 'success' : 'warning'}
                    />
                </CardContent>
             </Card>
          </Grid>
        ))}
      </Grid>

      {/* Alerts Section */}
      {health.activeAlerts.length > 0 && (
          <Box sx={{ mb: 3 }}>
             {health.activeAlerts.map(alert => (
                 <MuiAlert severity={alert.severity} key={alert.id} sx={{ mb: 1 }}>
                     {alert.title} — {new Date(alert.timestamp).toLocaleTimeString()}
                 </MuiAlert>
             ))}
          </Box>
      )}

      {/* Live Activity & Autonomic */}
      <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Run Volume (Last 6 Hours)</Typography>
                  <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={runTrend}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" />
                              <YAxis />
                              <Tooltip />
                              <Area type="monotone" dataKey="runs" stroke="#8884d8" fill="#8884d8" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </Box>
              </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Autonomic Control</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                       <Typography>Active Loops</Typography>
                       <Typography fontWeight="bold">{autonomic.activeLoops} / {autonomic.totalLoops}</Typography>
                  </Box>
                  <Typography variant="subtitle2" gutterBottom>Recent Decisions:</Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                      {autonomic.recentDecisions.map((d, i) => (
                          <li key={i}><Typography variant="body2">{d}</Typography></li>
                      ))}
                  </Box>
              </Paper>

              <Paper sx={{ p: 3 }}>
                   <Typography variant="h6" gutterBottom>Live Stats</Typography>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                       <Typography>Active Runs</Typography>
                       <Chip label={stats.activeRuns} color="primary" size="small" />
                   </Box>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                       <Typography>Completed</Typography>
                       <Chip label={stats.completedRuns} color="success" size="small" />
                   </Box>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                       <Typography>Failed</Typography>
                       <Chip label={stats.failedRuns} color="error" size="small" />
                   </Box>
                   <Box sx={{ mt: 2 }}>
                       <Typography variant="caption">Tasks/min: {stats.tasksPerMinute}</Typography>
                   </Box>
              </Paper>
          </Grid>
      </Grid>
    </Box>
  );
};

function getHealthColor(score: number) {
    if (score >= 90) return '#2e7d32'; // Green
    if (score >= 70) return '#ed6c02'; // Orange
    return '#d32f2f'; // Red
}
