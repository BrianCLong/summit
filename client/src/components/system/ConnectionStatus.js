import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  LinearProgress,
  Alert,
  Tooltip,
  Icon,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Storage,
  Cloud,
  Speed,
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { GET_SERVER_STATS, GET_HEALTH } from '../../graphql/serverStats.gql';

const ConnectionStatus = () => {
  const [connectionState, setConnectionState] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const {
    loading: statsLoading,
    error: statsError,
    data: statsData,
    refetch: refetchStats,
  } = useQuery(GET_SERVER_STATS, {
    pollInterval: 5000, // Poll every 5 seconds
    errorPolicy: 'all',
    onCompleted: () => {
      setConnectionState('connected');
      setLastUpdate(new Date());
    },
    onError: () => {
      setConnectionState('error');
      setLastUpdate(new Date());
    },
  });

  const {
    loading: healthLoading,
    error: healthError,
    data: healthData,
  } = useQuery(GET_HEALTH, {
    pollInterval: 3000, // Poll every 3 seconds
    errorPolicy: 'all',
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'error':
        return <Error sx={{ color: 'error.main' }} />;
      case 'connecting':
      default:
        return <Warning sx={{ color: 'warning.main' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      case 'connecting':
      default:
        return 'warning';
    }
  };

  const getDatabaseStatusIcon = (status) => {
    if (status === 'connected') {
      return <CheckCircle sx={{ color: 'success.main', fontSize: 16 }} />;
    } else {
      return <Error sx={{ color: 'error.main', fontSize: 16 }} />;
    }
  };

  const handleRefresh = () => {
    refetchStats();
    setConnectionState('connecting');
  };

  const formatUptime = (uptime) => {
    if (!uptime) return 'Unknown';
    const seconds = parseInt(uptime.replace(' seconds', ''));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Speed /> Real-time Connection Status
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={getStatusIcon(connectionState)}
              label={
                connectionState.charAt(0).toUpperCase() +
                connectionState.slice(1)
              }
              color={getStatusColor(connectionState)}
              size="small"
              onClick={handleRefresh}
              sx={{ cursor: 'pointer' }}
            />
            <Typography variant="caption" color="text.secondary">
              Last: {lastUpdate.toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>

        {statsLoading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Fetching server status...
            </Typography>
          </Box>
        )}

        {statsError && !statsData && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Connection failed: {statsError.message}
            <br />
            <Typography variant="caption">
              Make sure the server is running on port 4001
            </Typography>
          </Alert>
        )}

        {statsData && (
          <Grid container spacing={2}>
            {/* Server Health */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <Cloud sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Server Health
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">Status:</Typography>
                    <Chip
                      label={healthData?.health ? 'Healthy' : 'Unknown'}
                      color={healthData?.health ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">Uptime:</Typography>
                    <Typography variant="body2" color="primary">
                      {formatUptime(statsData.serverStats?.uptime)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Database Status */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <Storage sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Database Status
                  </Typography>
                  {statsData.serverStats?.databaseStatus && (
                    <>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2">Redis:</Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {getDatabaseStatusIcon(
                            statsData.serverStats.databaseStatus.redis,
                          )}
                          <Typography variant="caption">
                            {statsData.serverStats.databaseStatus.redis}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2">PostgreSQL:</Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {getDatabaseStatusIcon(
                            statsData.serverStats.databaseStatus.postgres,
                          )}
                          <Typography variant="caption">
                            {statsData.serverStats.databaseStatus.postgres}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="body2">Neo4j:</Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {getDatabaseStatusIcon(
                            statsData.serverStats.databaseStatus.neo4j,
                          )}
                          <Typography variant="caption">
                            {statsData.serverStats.databaseStatus.neo4j}
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Data Statistics */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    📊 Data Overview
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {statsData.serverStats?.totalInvestigations || 0}
                        </Typography>
                        <Typography variant="caption">
                          Investigations
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="secondary">
                          {statsData.serverStats?.totalEntities || 0}
                        </Typography>
                        <Typography variant="caption">Entities</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main">
                          {statsData.serverStats?.totalRelationships || 0}
                        </Typography>
                        <Typography variant="caption">Relationships</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {connectionState === 'connected' ? '✓' : '⚠'}
                        </Typography>
                        <Typography variant="caption">Connection</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;
