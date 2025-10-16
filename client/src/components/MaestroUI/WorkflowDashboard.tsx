import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Timeline,
  CheckCircle,
  Error,
  Schedule,
  Info,
} from '@mui/icons-material';

interface Workflow {
  workflowId: string;
  workflowName: string;
  version: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'TERMINATED';
  startTime: string;
  endTime?: string;
  correlationId?: string;
  reasonForIncompletion?: string;
  tasks?: Task[];
}

interface Task {
  taskId: string;
  taskType: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
  startTime?: string;
  endTime?: string;
  reasonForIncompletion?: string;
}

interface WorkflowDefinition {
  name: string;
  description: string;
  version: number;
  tasks: Task[];
}

export const WorkflowDashboard: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowDefinitions, setWorkflowDefinitions] = useState<
    WorkflowDefinition[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockWorkflows: Workflow[] = [
      {
        workflowId: 'hello-world-001',
        workflowName: 'hello_world_workflow',
        version: 1,
        status: 'COMPLETED',
        startTime: '2023-12-01T10:00:00Z',
        endTime: '2023-12-01T10:02:00Z',
        correlationId: 'hw-001',
        tasks: [
          {
            taskId: 'health-check-001',
            taskType: 'health_check_task',
            status: 'COMPLETED',
            startTime: '2023-12-01T10:00:10Z',
            endTime: '2023-12-01T10:01:00Z',
          },
          {
            taskId: 'system-info-001',
            taskType: 'system_info_task',
            status: 'COMPLETED',
            startTime: '2023-12-01T10:01:00Z',
            endTime: '2023-12-01T10:02:00Z',
          },
        ],
      },
      {
        workflowId: 'hello-case-001',
        workflowName: 'hello_case_workflow',
        version: 1,
        status: 'RUNNING',
        startTime: '2023-12-01T10:30:00Z',
        correlationId: 'hc-001',
        tasks: [
          {
            taskId: 'data-ingest-001',
            taskType: 'data_ingest_task',
            status: 'COMPLETED',
            startTime: '2023-12-01T10:30:10Z',
            endTime: '2023-12-01T10:31:00Z',
          },
          {
            taskId: 'entity-resolution-001',
            taskType: 'entity_resolution_task',
            status: 'IN_PROGRESS',
            startTime: '2023-12-01T10:31:00Z',
          },
          {
            taskId: 'graph-analysis-001',
            taskType: 'graph_analysis_task',
            status: 'SCHEDULED',
          },
        ],
      },
    ];

    const mockDefinitions: WorkflowDefinition[] = [
      {
        name: 'hello_world_workflow',
        description:
          'Basic IntelGraph Maestro orchestrator health check workflow',
        version: 1,
        tasks: ['health_check_task', 'system_info_task'],
      },
      {
        name: 'hello_case_workflow',
        description:
          'End-to-end IntelGraph value loop: ingest → resolve → analyze → brief',
        version: 1,
        tasks: [
          'data_ingest_task',
          'entity_resolution_task',
          'graph_analysis_task',
          'intelligence_brief_task',
        ],
      },
    ];

    // Simulate API call delay
    setTimeout(() => {
      setWorkflows(mockWorkflows);
      setWorkflowDefinitions(mockDefinitions);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle color="success" />;
      case 'FAILED':
        return <Error color="error" />;
      case 'RUNNING':
      case 'IN_PROGRESS':
        return <Schedule color="primary" />;
      default:
        return <Info color="disabled" />;
    }
  };

  const getStatusColor = (
    status: string,
  ): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'RUNNING':
      case 'IN_PROGRESS':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleStartWorkflow = (definitionName: string) => {
    // Mock workflow start
    console.log(`Starting workflow: ${definitionName}`);
    setError(null);
  };

  const handleStopWorkflow = (workflowId: string) => {
    // Mock workflow stop
    console.log(`Stopping workflow: ${workflowId}`);
    setError(null);
  };

  const handleViewDetails = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setDetailsOpen(true);
  };

  const calculateProgress = (workflow: Workflow): number => {
    if (!workflow.tasks || workflow.tasks.length === 0) return 0;
    const completedTasks = workflow.tasks.filter(
      (t) => t.status === 'COMPLETED',
    ).length;
    return (completedTasks / workflow.tasks.length) * 100;
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          IntelGraph Maestro Workflows
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" mt={1}>
          Loading workflow data...
        </Typography>
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
        <Typography variant="h4" gutterBottom>
          IntelGraph Maestro Workflows
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Workflow Definitions */}
      <Typography variant="h6" gutterBottom>
        Available Workflows
      </Typography>
      <Grid container spacing={2} mb={4}>
        {workflowDefinitions.map((definition) => (
          <Grid item xs={12} md={6} key={definition.name}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="start"
                >
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {definition.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {definition.description}
                    </Typography>
                    <Chip
                      label={`v${definition.version}`}
                      size="small"
                      color="primary"
                    />
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartWorkflow(definition.name)}
                  >
                    Start
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Running Workflows */}
      <Typography variant="h6" gutterBottom>
        Workflow Executions
      </Typography>
      <Grid container spacing={2}>
        {workflows.map((workflow) => (
          <Grid item xs={12} key={workflow.workflowId}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="start"
                  mb={2}
                >
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      {getStatusIcon(workflow.status)}
                      <Typography variant="h6">
                        {workflow.workflowName}
                      </Typography>
                      <Chip
                        label={workflow.status}
                        color={getStatusColor(workflow.status)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      ID: {workflow.workflowId} | Started:{' '}
                      {new Date(workflow.startTime).toLocaleString()}
                    </Typography>
                    {workflow.correlationId && (
                      <Typography variant="body2" color="text.secondary">
                        Correlation: {workflow.correlationId}
                      </Typography>
                    )}
                  </Box>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(workflow)}
                    >
                      <Timeline />
                    </IconButton>
                    {workflow.status === 'RUNNING' && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleStopWorkflow(workflow.workflowId)}
                      >
                        <Stop />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                {workflow.status === 'RUNNING' && (
                  <Box>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Typography variant="body2">Progress</Typography>
                      <Typography variant="body2">
                        {Math.round(calculateProgress(workflow))}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={calculateProgress(workflow)}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Workflow Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Workflow Details: {selectedWorkflow?.workflowName}
        </DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Workflow ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedWorkflow.workflowId}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedWorkflow.status}
                    color={getStatusColor(selectedWorkflow.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Start Time
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedWorkflow.startTime).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    End Time
                  </Typography>
                  <Typography variant="body1">
                    {selectedWorkflow.endTime
                      ? new Date(selectedWorkflow.endTime).toLocaleString()
                      : 'Running...'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Tasks
              </Typography>
              <List>
                {selectedWorkflow.tasks?.map((task) => (
                  <ListItem key={task.taskId}>
                    <Box display="flex" alignItems="center" width="100%">
                      {getStatusIcon(task.status)}
                      <Box ml={2} flex={1}>
                        <ListItemText
                          primary={task.taskType}
                          secondary={`Status: ${task.status} | ID: ${task.taskId}`}
                        />
                      </Box>
                      {task.startTime && (
                        <Typography variant="body2" color="text.secondary">
                          {new Date(task.startTime).toLocaleTimeString()}
                        </Typography>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
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
