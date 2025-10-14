import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  Button,
  Tooltip,
  alpha,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TimelineIcon from '@mui/icons-material/Timeline';
import ChecklistIcon from '@mui/icons-material/Checklist';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import InsightsIcon from '@mui/icons-material/Insights';
import {
  createDefaultMissionPresets,
  createLaunchableOrchestrator,
  MissionPreset,
  ModuleSnapshot,
  OrchestratorSnapshot,
} from '../../services/orchestrator';

type MissionPresetWithIcon = MissionPreset & { icon: React.ReactNode };

const formatUptime = (uptimeMs: number): string => {
  if (!uptimeMs || uptimeMs <= 0) {
    return '0s';
  }
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

const moduleStateColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  running: 'success',
  starting: 'warning',
  error: 'error',
  offline: 'default',
};

const presetIcons: Record<string, React.ReactNode> = {
  'launch-readiness': <RocketLaunchIcon fontSize="small" />,
  'stability-check': <ChecklistIcon fontSize="small" />,
  'insight-sync': <InsightsIcon fontSize="small" />,
  'rapid-response': <SyncAltIcon fontSize="small" />,
};

const metricValue = (value: number): string => `${Math.round(value * 100) / 100}`;

const OrchestratorDashboard: React.FC = () => {
  const orchestrator = useMemo(() => createLaunchableOrchestrator(), []);
  const [snapshot, setSnapshot] = useState<OrchestratorSnapshot>(
    orchestrator.getSnapshot(),
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const presets = useMemo<MissionPresetWithIcon[]>(() => {
    const basePresets = createDefaultMissionPresets();
    return basePresets.map((preset) => ({
      ...preset,
      icon: presetIcons[preset.id] ?? <RocketLaunchIcon fontSize="small" />,
    }));
  }, []);

  useEffect(() => {
    const unsubscribers = [
      orchestrator.on('module:status', () => {
        setSnapshot(orchestrator.getSnapshot());
      }),
      orchestrator.on('task:started', (record) => {
        setActiveTaskId(record.task.id);
        setSnapshot(orchestrator.getSnapshot());
      }),
      orchestrator.on('task:completed', () => {
        setActiveTaskId(null);
        setSnapshot(orchestrator.getSnapshot());
      }),
      orchestrator.on('task:error', () => {
        setActiveTaskId(null);
        setSnapshot(orchestrator.getSnapshot());
      }),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [orchestrator]);

  useEffect(() => {
    orchestrator.startAll().then(() => {
      setSnapshot(orchestrator.getSnapshot());
      setInitialized(true);
    });
  }, [orchestrator]);

  const handleRunTask = useCallback(
    (preset: MissionPresetWithIcon) => {
      const task = preset.buildTask();
      setActiveTaskId(task.id);
      orchestrator.dispatchTask(task);
    },
    [orchestrator],
  );

  const renderModuleCard = (module: ModuleSnapshot) => {
    const { definition, status } = module;
    const color = moduleStateColor[status.state] ?? 'default';
    const reliabilityPercent = Math.round(status.telemetry.reliability * 100);

    return (
      <Grid item xs={12} md={6} lg={4} key={definition.id}>
        <Card elevation={3} sx={{ height: '100%' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">{definition.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {definition.summary}
                </Typography>
              </Box>
              <Chip label={status.state.toUpperCase()} color={color} size="small" />
            </Stack>

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Capabilities
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {definition.capabilities.map((capability) => (
                  <Chip key={capability} label={capability} size="small" />
                ))}
              </Stack>
            </Stack>

            <Stack spacing={1.5} sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Telemetry
              </Typography>
              <Stack spacing={1}>
                <Tooltip title="Average execution latency for the module">
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Latency</Typography>
                    <Typography variant="body2">
                      {status.telemetry.latencyMs} ms
                    </Typography>
                  </Stack>
                </Tooltip>
                <Tooltip title="Average module utilization">
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Utilization</Typography>
                    <Typography variant="body2">
                      {metricValue(status.telemetry.utilization * 100)}%
                    </Typography>
                  </Stack>
                </Tooltip>
                <Tooltip title="Execution success rate">
                  <Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Reliability</Typography>
                      <Typography variant="body2">{reliabilityPercent}%</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={reliabilityPercent}
                      sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                    />
                  </Stack>
                </Tooltip>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Tasks Processed</Typography>
                  <Typography variant="body2">{status.tasksProcessed}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Uptime</Typography>
                  <Typography variant="body2">{formatUptime(status.uptimeMs)}</Typography>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderTaskHistory = () => (
    <Stack spacing={2}>
      {snapshot.tasks.slice(0, 6).map((record) => (
        <Card
          key={`${record.task.id}-${record.startedAt}`}
          variant="outlined"
          sx={{
            borderColor:
              record.status === 'completed'
                ? (theme) => alpha(theme.palette.success.main, 0.4)
                : record.status === 'error'
                  ? (theme) => alpha(theme.palette.error.main, 0.4)
                  : undefined,
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1">{record.task.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {record.task.requestedBy} • {new Date(record.startedAt).toLocaleTimeString()}
                </Typography>
              </Box>
              <Chip
                label={record.status.toUpperCase()}
                color={record.status === 'completed' ? 'success' : record.status === 'error' ? 'error' : 'warning'}
                size="small"
              />
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              {record.results.map((result) => (
                <Grid item xs={12} md={6} key={`${result.moduleId}-${result.action}`}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      {result.moduleId} — {result.action}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {result.message}
                    </Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Card elevation={4}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TimelineIcon color="primary" />
                  <Typography variant="h5">Launchable Orchestrator Control Center</Typography>
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Coordinate Maestro Composer, Build Plane, Build Platform, CompanyOS, Switchboard,
                  IntelGraph, and Activities from a single real-time control surface.
                </Typography>
              </Box>
              <Chip
                icon={<PlayArrowIcon />}
                label={initialized ? 'Online' : 'Initializing'}
                color={initialized ? 'success' : 'warning'}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={3}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Mission Presets</Typography>
              <Grid container spacing={2}>
                {presets.map((preset) => {
                  const isActive = Boolean(
                    activeTaskId && activeTaskId.startsWith(preset.id),
                  );
                  return (
                    <Grid item xs={12} md={6} lg={3} key={preset.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          borderColor: isActive
                            ? (theme) => theme.palette.primary.main
                            : undefined,
                        }}
                      >
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip icon={preset.icon} label={preset.name} variant="outlined" />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {preset.description}
                            </Typography>
                            <Button
                              variant="contained"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => handleRunTask(preset)}
                              disabled={isActive}
                            >
                              Launch
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {snapshot.modules.map((module) => renderModuleCard(module))}
        </Grid>

        <Card elevation={3}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <ChecklistIcon color="primary" />
              <Typography variant="h6">Recent Missions</Typography>
            </Stack>
            {snapshot.tasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No missions executed yet. Launch a preset to generate telemetry.
              </Typography>
            ) : (
              renderTaskHistory()
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default OrchestratorDashboard;
