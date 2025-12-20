/**
 * Enhanced Copilot Run Panel for IntelGraph
 *
 * Features:
 * - Start, pause, resume Copilot runs
 * - Live event streaming via Socket.IO
 * - Task progress visualization
 * - Event history with pagination
 * - Resume/retry capabilities
 * - Error handling and notifications
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Collapse,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Timeline as TimelineIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';

// GraphQL operations
import {
  START_COPILOT_RUN,
  PAUSE_COPILOT_RUN,
  RESUME_COPILOT_RUN,
  GET_COPILOT_RUN,
  COPILOT_EVENTS_SUBSCRIPTION,
} from '../../graphql/copilot.gql';

const EnhancedCopilotRunPanel = ({ investigationId, onRunCreated }) => {
  const [selectedRun, setSelectedRun] = useState(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    tasks: true,
    events: true,
  });
  const [eventFilter, setEventFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);

  const eventsEndRef = useRef(null);
  const socket = useSocket();

  // GraphQL mutations
  const [startRun, { loading: startingRun }] = useMutation(START_COPILOT_RUN);
  const [pauseRun, { loading: pausingRun }] = useMutation(PAUSE_COPILOT_RUN);
  const [resumeRun, { loading: resumingRun }] = useMutation(RESUME_COPILOT_RUN);

  // Query for run details
  const {
    data: runData,
    loading: loadingRun,
    refetch: refetchRun,
  } = useQuery(GET_COPILOT_RUN, {
    variables: { id: selectedRun?.id },
    skip: !selectedRun?.id,
    pollInterval: selectedRun?.isActive ? 2000 : 0,
  });

  // Subscribe to real-time events
  const { data: eventData } = useSubscription(COPILOT_EVENTS_SUBSCRIPTION, {
    variables: { runId: selectedRun?.id },
    skip: !selectedRun?.id,
  });

  // Handle real-time events
  useEffect(() => {
    if (eventData?.copilotEvents) {
      const event = eventData.copilotEvents;
      addNotification(event.level, event.message);

      // Auto-scroll to latest event
      if (eventsEndRef.current) {
        eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [eventData]);

  // Socket.IO event handling (fallback)
  useEffect(() => {
    if (socket && selectedRun?.id) {
      const room = `copilot:run:${selectedRun.id}`;
      socket.emit('join', room);

      socket.on('copilot:event', (event) => {
        // Handle Socket.IO events as backup
        console.log('Socket.IO event:', event);
      });

      return () => {
        socket.emit('leave', room);
        socket.off('copilot:event');
      };
    }
  }, [socket, selectedRun?.id]);

  const addNotification = useCallback((level, message) => {
    const notification = {
      id: Date.now(),
      level,
      message,
      timestamp: new Date(),
    };
    setNotifications((prev) => [...prev.slice(-9), notification]);
  }, []);

  const handleStartRun = async () => {
    if (!goalText.trim()) return;

    try {
      const { data } = await startRun({
        variables: {
          goalText: goalText.trim(),
          investigationId,
        },
      });

      const newRun = data.startCopilotRun;
      setSelectedRun(newRun);
      setGoalDialogOpen(false);
      setGoalText('');

      if (onRunCreated) {
        onRunCreated(newRun);
      }

      addNotification('info', `Started Copilot run: ${newRun.goalText}`);
    } catch (error) {
      addNotification('error', `Failed to start run: ${error.message}`);
    }
  };

  const handlePauseRun = async () => {
    if (!selectedRun?.id) return;

    try {
      await pauseRun({
        variables: { runId: selectedRun.id },
      });
      refetchRun();
      addNotification('info', 'Copilot run paused');
    } catch (error) {
      addNotification('error', `Failed to pause run: ${error.message}`);
    }
  };

  const handleResumeRun = async () => {
    if (!selectedRun?.id) return;

    try {
      await resumeRun({
        variables: { runId: selectedRun.id },
      });
      refetchRun();
      addNotification('info', 'Copilot run resumed');
    } catch (error) {
      addNotification('error', `Failed to resume run: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'primary';
      case 'succeeded':
        return 'success';
      case 'failed':
        return 'error';
      case 'paused':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return <CircularProgress size={16} />;
      case 'succeeded':
        return <CheckIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'paused':
        return <PauseIcon color="warning" />;
      default:
        return <ScheduleIcon />;
    }
  };

  const getEventIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'progress':
        return <TimelineIcon color="primary" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const filterEvents = (events) => {
    if (eventFilter === 'all') return events;
    return events.filter((event) => event.level === eventFilter);
  };

  const calculateProgress = () => {
    if (!runData?.copilotRun?.tasks) return 0;

    const tasks = runData.copilotRun.tasks;
    const completedTasks = tasks.filter(
      (task) => task.status === 'succeeded' || task.status === 'failed',
    ).length;

    return tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  };

  const currentRun = runData?.copilotRun;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6">Copilot Run</Typography>
              {currentRun && (
                <Chip
                  icon={getStatusIcon(currentRun.status)}
                  label={currentRun.status}
                  color={getStatusColor(currentRun.status)}
                  size="small"
                />
              )}
            </Box>
          }
          action={
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={() => setGoalDialogOpen(true)}
                disabled={startingRun}
                size="small"
              >
                New Run
              </Button>

              {currentRun?.status === 'running' && (
                <IconButton
                  onClick={handlePauseRun}
                  disabled={pausingRun}
                  size="small"
                >
                  <PauseIcon />
                </IconButton>
              )}

              {(currentRun?.status === 'paused' ||
                currentRun?.status === 'failed') && (
                <IconButton
                  onClick={handleResumeRun}
                  disabled={resumingRun}
                  size="small"
                >
                  <RefreshIcon />
                </IconButton>
              )}
            </Box>
          }
        />

        {currentRun && (
          <CardContent>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Goal: {currentRun.goalText}
            </Typography>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="caption">
                Progress: {Math.round(calculateProgress())}%
              </Typography>
              <Typography variant="caption">
                {currentRun.startedAt &&
                  `Running for ${formatDistanceToNow(new Date(currentRun.startedAt))}`}
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={calculateProgress()}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </CardContent>
        )}
      </Card>

      {/* Content */}
      {currentRun && (
        <Box sx={{ flex: 1, overflow: 'hidden', mt: 2 }}>
          {/* Tasks Section */}
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1">Tasks</Typography>
                  <Badge
                    badgeContent={currentRun.tasks?.length || 0}
                    color="primary"
                  >
                    <CodeIcon />
                  </Badge>
                </Box>
              }
              action={
                <IconButton
                  onClick={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      tasks: !prev.tasks,
                    }))
                  }
                  size="small"
                >
                  {expandedSections.tasks ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </IconButton>
              }
            />

            <Collapse in={expandedSections.tasks}>
              <CardContent>
                <List dense>
                  {currentRun.tasks?.map((task, index) => (
                    <ListItem key={task.id}>
                      <ListItemIcon>{getStatusIcon(task.status)}</ListItemIcon>
                      <ListItemText
                        primary={`${index + 1}. ${task.taskType}`}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              Status: {task.status}
                            </Typography>
                            {task.startedAt && (
                              <Typography variant="caption" display="block">
                                Started:{' '}
                                {formatDistanceToNow(new Date(task.startedAt))}{' '}
                                ago
                              </Typography>
                            )}
                            {task.errorMessage && (
                              <Typography
                                variant="caption"
                                color="error"
                                display="block"
                              >
                                Error: {task.errorMessage}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Collapse>
          </Card>

          {/* Events Section */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1">Events</Typography>
                  <Badge
                    badgeContent={currentRun.events?.length || 0}
                    color="secondary"
                  >
                    <TimelineIcon />
                  </Badge>
                </Box>
              }
              action={
                <Box display="flex" gap={1}>
                  <TextField
                    select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    size="small"
                    SelectProps={{ native: true }}
                  >
                    <option value="all">All Events</option>
                    <option value="info">Info</option>
                    <option value="warning">Warnings</option>
                    <option value="error">Errors</option>
                    <option value="progress">Progress</option>
                  </TextField>

                  <IconButton
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        events: !prev.events,
                      }))
                    }
                    size="small"
                  >
                    {expandedSections.events ? (
                      <ExpandLessIcon />
                    ) : (
                      <ExpandMoreIcon />
                    )}
                  </IconButton>
                </Box>
              }
            />

            <Collapse in={expandedSections.events} sx={{ flex: 1 }}>
              <CardContent sx={{ flex: 1, overflow: 'auto', maxHeight: 300 }}>
                <List dense>
                  {filterEvents(currentRun.events || []).map((event) => (
                    <ListItem key={event.id}>
                      <ListItemIcon>{getEventIcon(event.level)}</ListItemIcon>
                      <ListItemText
                        primary={event.message}
                        secondary={
                          <Typography variant="caption">
                            {formatDistanceToNow(new Date(event.createdAt))} ago
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                  <div ref={eventsEndRef} />
                </List>
              </CardContent>
            </Collapse>
          </Card>
        </Box>
      )}

      {/* New Goal Dialog */}
      <Dialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Start New Copilot Run</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Investigation Goal"
            fullWidth
            multiline
            rows={4}
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="Describe what you want the Copilot to analyze or investigate..."
            helperText="Be specific about your analysis goals. Examples: 'Find connections between entities X and Y', 'Identify potential threats in the network', 'Analyze communication patterns'"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStartRun}
            disabled={!goalText.trim() || startingRun}
            variant="contained"
          >
            {startingRun ? 'Starting...' : 'Start Run'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
          {notifications.slice(-3).map((notification) => (
            <Alert
              key={notification.id}
              severity={
                notification.level === 'error'
                  ? 'error'
                  : notification.level === 'warning'
                    ? 'warning'
                    : 'info'
              }
              sx={{ mb: 1, minWidth: 300 }}
              onClose={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notification.id),
                )
              }
            >
              {notification.message}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default EnhancedCopilotRunPanel;
