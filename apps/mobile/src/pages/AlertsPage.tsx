/**
 * Alerts Page
 * Shows user's alerts and tasks with offline support
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tab,
  Tabs,
  Skeleton,
  SwipeableDrawer,
  Button,
  Divider,
  Badge,
} from '@mui/material';
import {
  NotificationsActive,
  Assignment,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  ChevronRight,
  Refresh,
  Done,
} from '@mui/icons-material';
import { useAlerts } from '@/hooks/useAlerts';
import { useTasks } from '@/hooks/useTasks';
import { getSeverityColor, getPriorityColor } from '@/theme';
import type { Alert, Task, Severity, Priority } from '@/types';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  );
}

// Severity icon component
function SeverityIcon({ severity }: { severity: Severity }) {
  const color = getSeverityColor(severity);
  switch (severity) {
    case 'critical':
      return <ErrorIcon sx={{ color }} />;
    case 'error':
    case 'warning':
      return <Warning sx={{ color }} />;
    default:
      return <Info sx={{ color }} />;
  }
}

// Alert item component
interface AlertItemProps {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onSelect: (alert: Alert) => void;
}

function AlertItem({ alert, onAcknowledge, onSelect }: AlertItemProps) {
  return (
    <ListItem
      onClick={() => onSelect(alert)}
      sx={{
        bgcolor: alert.isRead ? 'transparent' : 'action.hover',
        borderRadius: 2,
        mb: 1,
        cursor: 'pointer',
      }}
    >
      <ListItemIcon>
        <SeverityIcon severity={alert.severity} />
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography
            variant="body1"
            fontWeight={alert.isRead ? 400 : 600}
            noWrap
          >
            {alert.title}
          </Typography>
        }
        secondary={
          <Box>
            <Typography variant="caption" color="text.secondary" noWrap>
              {alert.message}
            </Typography>
            <Typography variant="caption" color="text.disabled" display="block">
              {new Date(alert.createdAt).toLocaleString()}
            </Typography>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        {!alert.acknowledgedAt ? (
          <IconButton
            edge="end"
            onClick={(e) => {
              e.stopPropagation();
              onAcknowledge(alert.id);
            }}
            size="small"
          >
            <Done />
          </IconButton>
        ) : (
          <CheckCircle color="success" fontSize="small" />
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
}

// Task item component
interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onSelect: (task: Task) => void;
}

function TaskItem({ task, onComplete, onSelect }: TaskItemProps) {
  const priorityColor = getPriorityColor(task.priority);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <ListItem
      onClick={() => onSelect(task)}
      sx={{
        borderRadius: 2,
        mb: 1,
        cursor: 'pointer',
        borderLeft: `4px solid ${priorityColor}`,
      }}
    >
      <ListItemIcon>
        <Assignment />
      </ListItemIcon>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body1" fontWeight={500} noWrap sx={{ flex: 1 }}>
              {task.title}
            </Typography>
            <Chip
              label={task.priority}
              size="small"
              sx={{
                bgcolor: priorityColor,
                color: 'white',
                fontSize: '0.65rem',
                height: 20,
              }}
            />
          </Box>
        }
        secondary={
          <Box>
            {task.dueDate && (
              <Typography
                variant="caption"
                color={isOverdue ? 'error' : 'text.secondary'}
              >
                Due: {new Date(task.dueDate).toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </Typography>
            )}
          </Box>
        }
      />
      <ListItemSecondaryAction>
        {task.status !== 'completed' ? (
          <IconButton
            edge="end"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task.id);
            }}
            size="small"
          >
            <Done />
          </IconButton>
        ) : (
          <CheckCircle color="success" fontSize="small" />
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
}

// Main Alerts Page
export function AlertsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const {
    alerts,
    unreadCount,
    isLoading: alertsLoading,
    refresh: refreshAlerts,
    acknowledge,
  } = useAlerts();

  const {
    tasks,
    pendingCount,
    isLoading: tasksLoading,
    refresh: refreshTasks,
    updateStatus,
  } = useTasks();

  const handleRefresh = async () => {
    await Promise.all([refreshAlerts(), refreshTasks()]);
  };

  const handleCompleteTask = (id: string) => {
    updateStatus(id, 'completed');
  };

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Inbox
        </Typography>
        <IconButton onClick={handleRefresh} disabled={alertsLoading || tasksLoading}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
        >
          <Tab
            label={
              <Badge badgeContent={unreadCount} color="error">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsActive fontSize="small" />
                  Alerts
                </Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={pendingCount} color="primary">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment fontSize="small" />
                  Tasks
                </Box>
              </Badge>
            }
          />
        </Tabs>
      </Box>

      {/* Alerts Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ px: 2 }}>
          {alertsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={80}
                sx={{ mb: 1, borderRadius: 2 }}
              />
            ))
          ) : alerts.length === 0 ? (
            <Box textAlign="center" py={4}>
              <NotificationsActive
                sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}
              />
              <Typography color="text.secondary">No alerts</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={acknowledge}
                  onSelect={setSelectedAlert}
                />
              ))}
            </List>
          )}
        </Box>
      </TabPanel>

      {/* Tasks Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ px: 2 }}>
          {tasksLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={80}
                sx={{ mb: 1, borderRadius: 2 }}
              />
            ))
          ) : tasks.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No tasks</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onSelect={setSelectedTask}
                />
              ))}
            </List>
          )}
        </Box>
      </TabPanel>

      {/* Alert Detail Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onOpen={() => {}}
        PaperProps={{
          sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
        }}
      >
        {selectedAlert && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
              <SeverityIcon severity={selectedAlert.severity} />
              <Box flex={1}>
                <Typography variant="h6">{selectedAlert.title}</Typography>
                <Chip
                  label={selectedAlert.type.replace('_', ' ')}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>
            <Typography variant="body1" paragraph>
              {selectedAlert.message}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(selectedAlert.createdAt).toLocaleString()}
            </Typography>
            {selectedAlert.acknowledgedAt && (
              <Typography variant="caption" color="text.secondary" display="block">
                Acknowledged: {new Date(selectedAlert.acknowledgedAt).toLocaleString()}
              </Typography>
            )}
            <Box mt={3} display="flex" gap={2}>
              {!selectedAlert.acknowledgedAt && (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    acknowledge(selectedAlert.id);
                    setSelectedAlert(null);
                  }}
                >
                  Acknowledge
                </Button>
              )}
              {selectedAlert.caseId && (
                <Button
                  variant="outlined"
                  fullWidth
                  endIcon={<ChevronRight />}
                  href={`/cases/${selectedAlert.caseId}`}
                >
                  View Case
                </Button>
              )}
            </Box>
          </Box>
        )}
      </SwipeableDrawer>

      {/* Task Detail Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onOpen={() => {}}
        PaperProps={{
          sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
        }}
      >
        {selectedTask && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
              <Assignment />
              <Box flex={1}>
                <Typography variant="h6">{selectedTask.title}</Typography>
                <Chip
                  label={selectedTask.priority}
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: getPriorityColor(selectedTask.priority),
                    color: 'white',
                  }}
                />
              </Box>
            </Box>
            {selectedTask.description && (
              <Typography variant="body1" paragraph>
                {selectedTask.description}
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Status: {selectedTask.status}
            </Typography>
            {selectedTask.dueDate && (
              <Typography variant="caption" color="text.secondary" display="block">
                Due: {new Date(selectedTask.dueDate).toLocaleString()}
              </Typography>
            )}
            <Box mt={3} display="flex" gap={2}>
              {selectedTask.status !== 'completed' && (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    handleCompleteTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                >
                  Mark Complete
                </Button>
              )}
              <Button
                variant="outlined"
                fullWidth
                endIcon={<ChevronRight />}
                href={`/cases/${selectedTask.caseId}`}
              >
                View Case
              </Button>
            </Box>
          </Box>
        )}
      </SwipeableDrawer>
    </Box>
  );
}

export default AlertsPage;
