import React, { useState, useEffect } from 'react';
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
  IconButton,
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

interface LiveActivityFeedProps {
  headingId?: string;
}

const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

export default function LiveActivityFeed({ headingId = 'live-activity-heading' }: LiveActivityFeedProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleKeyToggle = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggleExpand();
    }
  };

  return (
    <Paper elevation={1} sx={{ borderRadius: 3 }} component="section" aria-labelledby={headingId}>
      <ButtonBase
        component="header"
        onClick={handleToggleExpand}
        onKeyDown={handleKeyToggle}
        aria-expanded={isExpanded}
        aria-controls={`${headingId}-panel`}
        sx={{
          p: 2,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={newActivityCount} color="error" invisible={newActivityCount === 0}>
            <TimelineIcon />
          </Badge>
          <Typography id={headingId} variant="h6" component="h2">
            Live Activity
          </Typography>
          {loading && (
            <Chip label="Connecting..." size="small" color="warning" variant="outlined" />
          )}
          {error && <Chip label="Offline" size="small" color="error" variant="outlined" />}
        </Box>
        <IconButton
          size="small"
          aria-label={isExpanded ? 'Collapse live activity feed' : 'Expand live activity feed'}
          onClick={(event) => {
            event.stopPropagation();
            handleToggleExpand();
          }}
        >
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </ButtonBase>

      <Collapse in={isExpanded} id={`${headingId}-panel`}>
        <Box sx={{ pb: 2 }}>
          {activities.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No recent activity
            </Typography>
          ) : (
            <>
              <Typography component="p" variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
                Most recent events appear first. Notifications are announced in the order received.
              </Typography>
              <List dense aria-live="polite" aria-busy={loading} aria-labelledby={headingId}>
                {activities.map((activity) => {
                  const chipTone = getActivityColor(activity.type);
                  return (
                    <ListItem key={activity.id} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {getActivityIcon(activity.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" component="span">
                              {activity.message}
                            </Typography>
                            <Chip
                              label={activity.type.toLowerCase().replace('_', ' ')}
                              size="small"
                              color={chipTone === 'default' ? undefined : chipTone}
                              variant="filled"
                              sx={{
                                textTransform: 'capitalize',
                                color: 'common.white',
                                bgcolor: chipTone === 'default' ? 'grey.700' : undefined,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {activity.actor.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {formatTimestamp(activity.timestamp)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </>
          )}
        </Box>
      </Collapse>
      <Box component="p" sx={srOnly} aria-live="polite">
        {newActivityCount > 0
          ? `${newActivityCount} new activities available.`
          : 'Live activity feed is up to date.'}
      </Box>
    </Paper>
  );
}
