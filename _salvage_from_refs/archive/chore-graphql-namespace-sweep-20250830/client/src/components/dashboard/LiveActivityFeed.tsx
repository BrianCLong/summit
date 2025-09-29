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
  Collapse
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useActivityFeedSubscription } from '../../generated/graphql.js';

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
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [newActivityCount, setNewActivityCount] = useState(0);

  // Subscribe to live activity feed
  const { data, loading, error } = useActivityFeedSubscription({
    onComplete: () => console.log('Activity subscription completed'),
    onError: (err) => console.warn('Activity subscription error:', err)
  });

  useEffect(() => {
    if (data?.activityFeed) {
      const newActivity = data.activityFeed as ActivityEvent;
      setActivities(prev => [newActivity, ...prev.slice(0, 19)]); // Keep last 20
      
      // Increment notification count if not expanded
      if (!isExpanded) {
        setNewActivityCount(prev => prev + 1);
      }
    }
  }, [data, isExpanded]);

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
    <Paper elevation={1} sx={{ borderRadius: 3 }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={handleToggleExpand}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge 
            badgeContent={newActivityCount} 
            color="error" 
            invisible={newActivityCount === 0}
          >
            <TimelineIcon />
          </Badge>
          <Typography variant="h6">Live Activity</Typography>
          {loading && (
            <Chip 
              label="Connecting..." 
              size="small" 
              color="warning" 
              variant="outlined"
            />
          )}
          {error && (
            <Chip 
              label="Offline" 
              size="small" 
              color="error" 
              variant="outlined"
            />
          )}
        </Box>
        <IconButton size="small">
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ pb: 2 }}>
          {activities.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No recent activity
            </Typography>
          ) : (
            <List dense>
              {activities.map((activity) => (
                <ListItem key={activity.id} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getActivityIcon(activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2">{activity.message}</Typography>
                        <Chip 
                          label={activity.type.toLowerCase().replace('_', ' ')}
                          size="small"
                          color={getActivityColor(activity.type)}
                          variant="outlined"
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
              ))}
            </List>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}