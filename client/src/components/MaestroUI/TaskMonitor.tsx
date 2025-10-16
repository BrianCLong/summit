import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Visibility,
  Refresh,
  Error,
  CheckCircle,
  Schedule,
  ExpandMore,
} from '@mui/icons-material';

interface TaskExecution {
  taskId: string;
  taskType: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SCHEDULED' | 'TIMED_OUT';
  workflowInstanceId: string;
  workflowType: string;
  startTime?: string;
  endTime?: string;
  executionTime?: number;
  retryCount: number;
  reasonForIncompletion?: string;
  inputData?: unknown;
  outputData?: unknown;
  logs?: string[];
}

interface TaskStatistics {
  totalTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
}

export const TaskMonitor: React.FC = () => {
  const [tasks, setTasks] = useState<TaskExecution[]>([]);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskExecution | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  // Mock data for demonstration
  useEffect(() => {
    const mockTasks: TaskExecution[] = [
      {
        taskId: 'health-check-001',
        taskType: 'health_check_task',
        status: 'COMPLETED',
        workflowInstanceId: 'hello-world-001',
        workflowType: 'hello_world_workflow',
        startTime: '2023-12-01T10:00:10Z',
        endTime: '2023-12-01T10:01:00Z',
        executionTime: 50000,
        retryCount: 0,
        inputData: {
          message: 'Hello from IntelGraph Maestro!',
          timestamp: '2023-12-01T10:00:00Z',
          environment: 'dev',
        },
        outputData: {
          status: 'healthy',
          checks: ['postgres', 'redis', 'workers'],
          timestamp: '2023-12-01T10:01:00Z',
        },
        logs: [
          'Starting health check...',
          'Checking PostgreSQL connection... OK',
          'Checking Redis connection... OK',
          'Checking worker availability... OK',
          'Health check completed successfully',
        ],
      },
      {
        taskId: 'data-ingest-002',
        taskType: 'data_ingest_task',
        status: 'IN_PROGRESS',
        workflowInstanceId: 'hello-case-001',
        workflowType: 'hello_case_workflow',
        startTime: '2023-12-01T10:30:10Z',
        retryCount: 0,
        inputData: {
          sources: [
            { type: 'osint', url: 'https://api.example.com/intel-feed' },
            { type: 'social', platform: 'twitter' },
          ],
          batch_size: 100,
        },
        logs: [
          'Starting data ingestion...',
          'Processing OSINT source...',
          'Fetching social media data...',
        ],
      },
      {
        taskId: 'entity-resolve-003',
        taskType: 'entity_resolution_task',
        status: 'FAILED',
        workflowInstanceId: 'hello-case-002',
        workflowType: 'hello_case_workflow',
        startTime: '2023-12-01T09:45:00Z',
        endTime: '2023-12-01T09:47:30Z',
        executionTime: 150000,
        retryCount: 2,
        reasonForIncompletion: 'Connection timeout to ML service',
        inputData: {
          entities: ['person', 'organization', 'location'],
          threshold: 0.85,
        },
        logs: [
          'Starting entity resolution...',
          'Loading ML models...',
          'ERROR: Connection timeout to ML service after 30s',
          'Retrying... (attempt 1/2)',
          'ERROR: Connection timeout to ML service after 30s',
          'Retrying... (attempt 2/2)',
          'ERROR: Connection timeout to ML service after 30s',
          'Task failed after maximum retries',
        ],
      },
    ];

    const mockStats: TaskStatistics = {
      totalTasks: 156,
      runningTasks: 3,
      completedTasks: 142,
      failedTasks: 11,
      averageExecutionTime: 45000,
    };

    setTimeout(() => {
      setTasks(mockTasks);
      setStatistics(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle color="success" fontSize="small" />;
      case 'FAILED':
      case 'TIMED_OUT':
        return <Error color="error" fontSize="small" />;
      case 'IN_PROGRESS':
        return <Schedule color="primary" fontSize="small" />;
      default:
        return <Schedule color="disabled" fontSize="small" />;
    }
  };

  const getStatusColor = (
    status: string,
  ): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
      case 'TIMED_OUT':
        return 'error';
      case 'IN_PROGRESS':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const filteredTasks = tasks.filter(
    (task) => filter === 'ALL' || task.status === filter,
  );

  const handleViewDetails = (task: TaskExecution) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Task Monitor
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">Task Monitor</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {statistics.totalTasks}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Tasks
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  {statistics.runningTasks}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Running
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {statistics.completedTasks}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main">
                  {statistics.failedTasks}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter Chips */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Filter by Status
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {['ALL', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SCHEDULED'].map(
            (status) => (
              <Chip
                key={status}
                label={status.replace('_', ' ')}
                onClick={() => setFilter(status)}
                color={filter === status ? 'primary' : 'default'}
                variant={filter === status ? 'filled' : 'outlined'}
              />
            ),
          )}
        </Box>
      </Box>

      {/* Tasks Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Task Type</TableCell>
              <TableCell>Workflow</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Retries</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task.taskId}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(task.status)}
                    <Chip
                      label={task.status.replace('_', ' ')}
                      color={getStatusColor(task.status)}
                      size="small"
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {task.taskType}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {task.taskId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{task.workflowType}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {task.workflowInstanceId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {task.startTime
                      ? new Date(task.startTime).toLocaleString()
                      : 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDuration(task.executionTime)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={task.retryCount}
                    color={task.retryCount > 0 ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(task)}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Task Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Task Details: {selectedTask?.taskType}</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box>
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Basic Information
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Task ID
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.taskId}
                    </Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={selectedTask.status}
                      color={getStatusColor(selectedTask.status)}
                      size="small"
                    />
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Workflow
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.workflowType}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTask.workflowInstanceId}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Execution Details
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Start Time
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.startTime
                        ? new Date(selectedTask.startTime).toLocaleString()
                        : 'N/A'}
                    </Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      End Time
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.endTime
                        ? new Date(selectedTask.endTime).toLocaleString()
                        : 'Running...'}
                    </Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Duration
                    </Typography>
                    <Typography variant="body1">
                      {formatDuration(selectedTask.executionTime)}
                    </Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Retry Count
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.retryCount}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {selectedTask.reasonForIncompletion && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Failure Reason:</strong>{' '}
                    {selectedTask.reasonForIncompletion}
                  </Typography>
                </Alert>
              )}

              {/* Input/Output Data */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">Input Data</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                      {JSON.stringify(selectedTask.inputData, null, 2)}
                    </pre>
                  </Paper>
                </AccordionDetails>
              </Accordion>

              {selectedTask.outputData && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2">Output Data</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                        {JSON.stringify(selectedTask.outputData, null, 2)}
                      </pre>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Logs */}
              {selectedTask.logs && selectedTask.logs.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2">Execution Logs</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.900' }}>
                      {selectedTask.logs.map((log, index) => (
                        <Typography
                          key={index}
                          variant="body2"
                          component="div"
                          sx={{
                            color: log.startsWith('ERROR')
                              ? 'error.main'
                              : 'grey.100',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                          }}
                        >
                          {log}
                        </Typography>
                      ))}
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
