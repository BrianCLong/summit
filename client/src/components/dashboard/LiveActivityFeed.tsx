import React, { useState, useId } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Badge,
  Collapse,
  ButtonBase,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';
// TODO: Re-enable GraphQL subscription when schema is available
// import { useActivityFeedSubscription } from '../../generated/graphql';

interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
  };
  metadata?: any;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'INVESTIGATION_CREATED':
    case 'INVESTIGATION_UPDATED':
      return <SearchIcon fontSize="small" />;
    case 'ENTITY_ADDED':
    case 'RELATIONSHIP_ADDED':
      return <TimelineIcon fontSize="small" />;
    case 'THREAT_DETECTED':
      return <SecurityIcon fontSize="small" />;
    case 'USER_LOGIN':
      return <PersonIcon fontSize="small" />;
    default:
      return <NotificationsIcon fontSize="small" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'THREAT_DETECTED':
      return 'error';
    case 'INVESTIGATION_CREATED':
      return 'primary';
    case 'ENTITY_ADDED':
    case 'RELATIONSHIP_ADDED':
      return 'success';
    default:
      return 'default';
  }
};

export default function LiveActivityFeed() {
  const [isExpanded, setIsExpanded] = useState(false);
  const headerId = useId();
  const panelId = useId();
  const descriptionId = useId();

  // Mock activities for development
  const mockActivities: ActivityEvent[] = [
    {
      id: '1',
      type: 'INVESTIGATION_CREATED',
      message: 'New investigation started: Financial Network Analysis',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      actor: { id: '1', name: 'John Smith' },
    },
    {
      id: '2',
      type: 'ENTITY_ADDED',
      message: 'Entity added to investigation: ABC Corporation',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
      actor: { id: '2', name: 'Sarah Johnson' },
    },
    {
      id: '3',
      type: 'THREAT_DETECTED',
      message: 'Potential threat identified in communication patterns',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
      actor: { id: '3', name: 'AI System' },
    },
    {
      id: '4',
      type: 'USER_LOGIN',
      message: 'User logged in from new location',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      actor: { id: '4', name: 'Mike Davis' },
    },
  ];

  const [activities, setActivities] = useState<ActivityEvent[]>(mockActivities);
  const [newActivityCount, setNewActivityCount] = useState(0);

  // TODO: Re-enable GraphQL subscription when schema is available
  // const { data, loading, error } = useActivityFeedSubscription({
  //   onComplete: () => console.log('Activity subscription completed'),
  //   onError: (err) => console.warn('Activity subscription error:', err)
  // });

  // Mock data for development
  const data = null;
  const loading = false;
  const error = null;

  // TODO: Re-enable when GraphQL subscription is available
  // useEffect(() => {
  //   if (data?.activityFeed) {
  //     const newActivity = data.activityFeed as ActivityEvent;
  //     setActivities(prev => [newActivity, ...prev.slice(0, 19)]); // Keep last 20
  //
  //     // Increment notification count if not expanded
  //     if (!isExpanded) {
  //       setNewActivityCount(prev => prev + 1);
  //     }
  //   }
  // }, [data, isExpanded]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setNewActivityCount(0); // Clear notification when expanding
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return eventTime.toLocaleDateString();
  };

  return (
    <Paper
      component="section"
      elevation={1}
      sx={{ borderRadius: 3 }}
      aria-labelledby={headerId}
    >
      <ButtonBase
        onClick={handleToggleExpand}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          textAlign: 'left',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          '&:focus-visible': {
            outline: (theme) => `3px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Badge
            badgeContent={newActivityCount}
            color="error"
            invisible={newActivityCount === 0}
            aria-label={
              newActivityCount === 0
                ? 'No unread activity'
                : `${newActivityCount} unread activity ${newActivityCount === 1 ? 'item' : 'items'}`
            }
          >
            <TimelineIcon aria-hidden="true" />
          </Badge>
          <Typography id={headerId} variant="h6" component="h2">
            Live Activity
          </Typography>
          {loading && (
            <Chip
              label="Connecting"
              size="small"
              color="warning"
              variant="outlined"
              role="status"
              aria-live="polite"
            />
          )}
          {error && (
            <Chip label="Offline" size="small" color="error" variant="outlined" role="status" />
          )}
          {newActivityCount > 0 && (
            <Typography component="span" sx={visuallyHidden} aria-live="polite">
              {newActivityCount} new activity {newActivityCount === 1 ? 'update' : 'updates'} available
            </Typography>
          )}
        </Box>
        <Box component="span" aria-hidden="true" sx={{ display: 'flex', alignItems: 'center' }}>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
      </ButtonBase>

      <Box component="p" id={descriptionId} sx={visuallyHidden}>
        Expanded live activity reveals the most recent investigations, entity updates, and alerts with
        timestamps.
      </Box>

      <Collapse in={isExpanded} id={panelId} role="region" aria-labelledby={headerId} aria-describedby={descriptionId}>
        <Box sx={{ pb: 2 }}>
          {activities.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 2, textAlign: 'center' }}
              role="status"
              aria-live="polite"
            >
              No recent activity
            </Typography>
          ) : (
            <List dense aria-live="polite" aria-labelledby={headerId} aria-describedby={descriptionId}>
              {activities.map((activity) => (
                <ListItem key={activity.id} sx={{ py: 0.75, alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 32 }} aria-hidden="true">
                    {getActivityIcon(activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" component="p" sx={{ color: 'text.primary' }}>
                          {activity.message}
                        </Typography>
                        <Chip
                          label={activity.type.toLowerCase().replace('_', ' ')}
                          size="small"
                          color={getActivityColor(activity.type)}
                          variant="outlined"
                          aria-label={`Activity type: ${activity.type.toLowerCase().replace('_', ' ')}`}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography component="span" variant="caption" color="text.secondary">
                          Performed by {activity.actor.name}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {formatTimestamp(activity.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
