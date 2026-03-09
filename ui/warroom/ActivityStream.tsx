/**
 * Summit War Room — Activity Stream
 *
 * Real-time feed of investigation events, agent actions,
 * collaborator activity, and system notifications.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import HubIcon from '@mui/icons-material/Hub';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import SourceIcon from '@mui/icons-material/Source';
import ScienceIcon from '@mui/icons-material/Science';
import { useWarRoomStore } from './store';

type ActivityEntry = {
  id: string;
  type: 'agent' | 'entity' | 'evidence' | 'simulation' | 'collaborator';
  message: string;
  timestamp: string;
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  agent: <SmartToyIcon fontSize="small" color="success" />,
  entity: <HubIcon fontSize="small" color="primary" />,
  evidence: <SourceIcon fontSize="small" color="warning" />,
  simulation: <ScienceIcon fontSize="small" color="secondary" />,
  collaborator: <PersonIcon fontSize="small" color="info" />,
};

export const ActivityStream: React.FC = () => {
  const agentTasks = useWarRoomStore((s) => s.agentTasks);
  const collaborators = useWarRoomStore((s) => s.collaborators);

  // Build activity entries from agent tasks and collaborators
  const activities: ActivityEntry[] = [
    ...agentTasks.map((t) => ({
      id: `agent-${t.id}`,
      type: 'agent' as const,
      message: `${t.agentName}: ${t.status} (${t.progress}%)`,
      timestamp: t.startedAt,
    })),
    ...collaborators.map((c) => ({
      id: `collab-${c.id}`,
      type: 'collaborator' as const,
      message: `${c.name} is online`,
      timestamp: c.lastSeen,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Activity Stream</Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activities.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No recent activity
          </Typography>
        )}
        <List dense disablePadding>
          {activities.map((entry) => (
            <ListItem key={entry.id} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                {ACTIVITY_ICONS[entry.type]}
              </ListItemIcon>
              <ListItemText
                primary={entry.message}
                secondary={new Date(entry.timestamp).toLocaleTimeString()}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};
