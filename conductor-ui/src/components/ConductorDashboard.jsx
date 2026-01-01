import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Button,
  CircularProgress,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  BarChart as ChartIcon, 
  People as PeopleIcon, 
  Settings as SettingsIcon, 
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ConductorDashboard = () => {
  const [healthStatus, setHealthStatus] = useState('checking...');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API calls to get system status
    const fetchHealth = async () => {
      try {
        // In a real application, this would fetch from actual endpoints
        setTimeout(() => {
          setHealthStatus('Operational');
          setMetrics({
            rps: 1.2,
            latency: 120,
            queue: 12,
            errors: 0,
            uptime: '99.95%',
            activeUsers: 24,
            tasksCompleted: 1456,
            tasksPending: 8
          });
          setLoading(false);
        }, 1000);
      } catch (error) {
        setHealthStatus('Error');
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  // Mock data for charts
  const performanceData = [
    { time: '00:00', rps: 0.8, latency: 150 },
    { time: '04:00', rps: 0.5, latency: 120 },
    { time: '08:00', rps: 1.2, latency: 125 },
    { time: '12:00', rps: 1.8, latency: 180 },
    { time: '16:00', rps: 1.5, latency: 140 },
    { time: '20:00', rps: 1.1, latency: 110 },
    { time: '24:00', rps: 0.9, latency: 105 },
  ];

  const statusColor = healthStatus === 'Operational' ? 'success' : 
                     healthStatus === 'Warning' ? 'warning' : 'error';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Maestro Conductor
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Intelligence Analysis Platform - Operations Dashboard
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Status Overview */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={3}>
                <CardContent>
                  <Typography color="textSecondary">System Health</Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Chip 
                      icon={healthStatus === 'Operational' ? <SuccessIcon /> : 
                            healthStatus === 'Warning' ? <WarningIcon /> : <ErrorIcon />}
                      label={healthStatus}
                      color={healthStatus === 'Operational' ? 'success' : 
                             healthStatus === 'Warning' ? 'warning' : 'error'}
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={3}>
                <CardContent>
                  <Typography color="textSecondary">RPS</Typography>
                  <Typography variant="h5">{metrics?.rps} req/s</Typography>
                </CardContent>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={3}>
                <CardContent>
                  <Typography color="textSecondary">Latency (p95)</Typography>
                  <Typography variant="h5">{metrics?.latency}ms</Typography>
                </CardContent>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={3}>
                <CardContent>
                  <Typography color="textSecondary">Queue Depth</Typography>
                  <Typography variant="h5">{metrics?.queue}</Typography>
                </CardContent>
              </Paper>
            </Grid>
          </Grid>

          {/* Charts Section */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={8}>
              <Paper elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Performance Overview</Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Line 
                          yAxisId="left" 
                          type="monotone" 
                          dataKey="rps" 
                          stroke="#8884d8" 
                          name="RPS" 
                          strokeWidth={2}
                        />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="latency" 
                          stroke="#82ca9d" 
                          name="Latency (ms)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <Paper elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>System Status</Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><SuccessIcon color="success" /></ListItemIcon>
                      <ListItemText primary="API Server" secondary="Operational" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SuccessIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Database" secondary="Connected" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SuccessIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Message Queue" secondary="Healthy" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SuccessIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Cache Server" secondary="Ready" />
                    </ListItem>
                  </List>
                </CardContent>
              </Paper>
            </Grid>
          </Grid>

          {/* Quick Actions and Links */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                  <Box display="flex" flexWrap="wrap" gap={2}>
                    <Button variant="contained" startIcon={<InfoIcon />}>
                      Run Health Check
                    </Button>
                    <Button variant="outlined" startIcon={<WarningIcon />}>
                      View Alerts
                    </Button>
                    <Button variant="outlined" startIcon={<SettingsIcon />}>
                      Configure
                    </Button>
                  </Box>
                </CardContent>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Development Links</Typography>
                  <List>
                    <ListItem button component="a" href="http://localhost:8080/healthz" target="_blank">
                      <ListItemIcon><LinkIcon /></ListItemIcon>
                      <ListItemText primary="API Health" secondary="http://localhost:8080/healthz" />
                    </ListItem>
                    <ListItem button component="a" href="http://localhost:9090" target="_blank">
                      <ListItemIcon><LinkIcon /></ListItemIcon>
                      <ListItemText primary="Prometheus" secondary="http://localhost:9090" />
                    </ListItem>
                    <ListItem button component="a" href="http://localhost:3001" target="_blank">
                      <ListItemIcon><LinkIcon /></ListItemIcon>
                      <ListItemText primary="Grafana" secondary="http://localhost:3001" />
                    </ListItem>
                  </List>
                </CardContent>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default ConductorDashboard;