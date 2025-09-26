import { useEffect, useMemo, useState } from 'react';
import { useSubscription } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import { WORKFLOW_STATUS_SUBSCRIPTION } from './graphql';
import type { WorkflowRun, WorkflowStatusPayload } from './types';
import { WorkflowGraph } from './WorkflowGraph';
import { WorkflowLogsPanel } from './WorkflowLogsPanel';

const statusColor: Record<WorkflowRun['status'], ChipProps['color']> = {
  QUEUED: 'default',
  RUNNING: 'primary',
  PAUSED: 'warning',
  COMPLETED: 'success',
  FAILED: 'error',
};

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

const mergeWorkflows = (
  current: Record<string, WorkflowRun>,
  incoming: WorkflowRun,
): Record<string, WorkflowRun> => {
  const existing = current[incoming.id];
  if (!existing) {
    return {
      ...current,
      [incoming.id]: incoming,
    };
  }

  const logMap = new Map<string, boolean>();
  const mergedLogs: WorkflowRun['logs'] = [];
  [...existing.logs, ...incoming.logs].forEach((log) => {
    const key = `${log.timestamp}-${log.message}`;
    if (!logMap.has(key)) {
      logMap.set(key, true);
      mergedLogs.push(log);
    }
  });

  return {
    ...current,
    [incoming.id]: {
      ...existing,
      ...incoming,
      logs: mergedLogs,
      nodes: incoming.nodes.length ? incoming.nodes : existing.nodes,
    },
  };
};

export function WorkflowMonitoringDashboard() {
  const { data, error } = useSubscription<WorkflowStatusPayload>(
    WORKFLOW_STATUS_SUBSCRIPTION,
  );
  const [workflows, setWorkflows] = useState<Record<string, WorkflowRun>>({});
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (data?.workflowStatus) {
      setWorkflows((prev) => mergeWorkflows(prev, data.workflowStatus));
    }
  }, [data]);

  useEffect(() => {
    if (!selectedWorkflowId) {
      const first = Object.values(workflows)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .at(0);
      if (first) {
        setSelectedWorkflowId(first.id);
      }
    }
  }, [selectedWorkflowId, workflows]);

  const workflowList = useMemo(
    () =>
      Object.values(workflows).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    [workflows],
  );

  const selectedWorkflow = selectedWorkflowId
    ? workflows[selectedWorkflowId]
    : undefined;

  return (
    <Box p={3} data-testid="workflow-monitoring-dashboard">
      <Stack direction="row" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Workflow Monitoring
          </Typography>
          <Typography color="text.secondary">
            Live view of Maestro workflow-engine executions with graph topology
            and runtime logs.
          </Typography>
        </Box>
      </Stack>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Unable to subscribe to workflow updates: {error.message}
        </Alert>
      ) : null}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={3}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
      >
        <Box flex={{ xs: '0 0 auto', md: '0 0 340px' }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Workflows
              </Typography>
              <List>
                {workflowList.map((workflow) => (
                  <ListItem disablePadding key={workflow.id}>
                    <ListItemButton
                      selected={workflow.id === selectedWorkflowId}
                      onClick={() => setSelectedWorkflowId(workflow.id)}
                      aria-label={`Select workflow ${workflow.name}`}
                    >
                      <ListItemText
                        primary={workflow.name}
                        secondary={`Updated ${formatDateTime(
                          workflow.updatedAt,
                        )}`}
                      />
                      <Chip
                        label={workflow.status}
                        color={statusColor[workflow.status]}
                        size="small"
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
                {!workflowList.length ? (
                  <ListItem>
                    <ListItemText
                      primary="No workflows in-flight"
                      secondary="Waiting for the first execution event"
                    />
                  </ListItem>
                ) : null}
              </List>
            </CardContent>
          </Card>
        </Box>
        <Box flex={1} minWidth={0}>
          {selectedWorkflow ? (
            <Stack spacing={3}>
              <Card variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    gap={2}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                  >
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        {selectedWorkflow.name}
                      </Typography>
                      <Typography color="text.secondary">
                        Started {formatDateTime(selectedWorkflow.startedAt)} •
                        Last update {formatDateTime(selectedWorkflow.updatedAt)}
                      </Typography>
                    </Box>
                    <Chip
                      label={selectedWorkflow.status}
                      color={statusColor[selectedWorkflow.status]}
                      size="medium"
                    />
                  </Stack>
                  <Box mt={3}>
                    <Typography gutterBottom>Progress</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.round(selectedWorkflow.progress * 100)}
                      aria-label="Workflow progress"
                    />
                  </Box>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <WorkflowGraph nodes={selectedWorkflow.nodes} />
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Execution Logs
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <WorkflowLogsPanel logs={selectedWorkflow.logs} />
                </CardContent>
              </Card>
            </Stack>
          ) : (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body1">
                  Select a workflow to inspect its topology and runtime logs.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
}
