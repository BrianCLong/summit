import { List, ListItem, ListItemText, Typography } from '@mui/material';
import type { WorkflowLogEntry } from './types';

interface WorkflowLogsPanelProps {
  logs: WorkflowLogEntry[];
}

const levelColor: Record<WorkflowLogEntry['level'], string> = {
  INFO: 'text.primary',
  WARN: 'warning.main',
  ERROR: 'error.main',
};

const formatTimestamp = (value: string) => {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch (error) {
    return value;
  }
};

export function WorkflowLogsPanel({ logs }: WorkflowLogsPanelProps) {
  if (!logs.length) {
    return (
      <Typography variant="body2" color="text.secondary" data-testid="workflow-empty-logs">
        Waiting for execution logs.
      </Typography>
    );
  }

  return (
    <List dense sx={{ maxHeight: 260, overflowY: 'auto' }}>
      {logs.map((log) => (
        <ListItem key={log.id} alignItems="flex-start">
          <ListItemText
            primary={log.message}
            primaryTypographyProps={{ color: levelColor[log.level] }}
            secondary={`${log.level} • ${formatTimestamp(log.timestamp)}`}
          />
        </ListItem>
      ))}
    </List>
  );
}
