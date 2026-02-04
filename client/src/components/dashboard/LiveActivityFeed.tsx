import React, { useEffect, useState } from 'react';
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
import { gql, useQuery } from '@apollo/client';

interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
  };
  metadata?: unknown;
}

interface ActivityFeedRow {
  id: string;
  actionType: string;
  resourceType?: string | null;
  resourceId?: string | null;
  actorId?: string | null;
  timestamp: string;
  payload?: unknown;
  metadata?: unknown;
}

interface ActivityFeedResponse {
  activities: ActivityFeedRow[];
}

const ACTIVITY_FEED_QUERY = gql`
  query ActivityFeed($limit: Int, $offset: Int) {
    activities(limit: $limit, offset: $offset) {
      id
      actionType
      resourceType
      resourceId
      actorId
      timestamp
      payload
      metadata
    }
  }
`;

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

const mapActivity = (row: ActivityFeedRow): ActivityEvent => {
  const payload =
    row.payload && typeof row.payload === 'object'
      ? (row.payload as Record<string, unknown>)
      : undefined;
  const metadata =
    row.metadata && typeof row.metadata === 'object'
      ? (row.metadata as Record<string, unknown>)
      : undefined;

  const message =
    (payload?.message as string) ||
    (metadata?.message as string) ||
    `${row.actionType}${row.resourceType ? `: ${row.resourceType}` : ''}`;

  const actorName =
    (payload?.actorName as string) ||
    (metadata?.actorName as string) ||
    row.actorId ||
    'Unknown';

  return {
    id: row.id,
    type: row.actionType,
    message,
    timestamp: row.timestamp,
    actor: {
      id: row.actorId || 'unknown',
      name: actorName,
    },
    metadata: row.metadata,
  };
};

export default function LiveActivityFeed() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [newActivityCount, setNewActivityCount] = useState(0);

  const { data, loading, error } = useQuery<ActivityFeedResponse>(
    ACTIVITY_FEED_QUERY,
    {
      variables: { limit: 20, offset: 0 },
      pollInterval: 15000,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    },
  );

  useEffect(() => {
    if (!data?.activities) return;
    const next = data.activities.map(mapActivity);

    setActivities((prev) => {
      if (!prev.length) return next;
      const prevIds = new Set(prev.map((activity) => activity.id));
      const incoming = next.filter((activity) => !prevIds.has(activity.id));
      if (!isExpanded && incoming.length > 0) {
        setNewActivityCount((count) => count + incoming.length);
      }
      return next;
    });
  }, [data, isExpanded]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setNewActivityCount(0);
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
          cursor: 'pointer',
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
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 2, textAlign: 'center' }}
            >
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
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography variant="body2">
                          {activity.message}
                        </Typography>
                        <Chip
                          label={activity.type
                            .toLowerCase()
                            .replace('_', ' ')}
                          size="small"
                          color={getActivityColor(activity.type)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {activity.actor.name} • {formatTimestamp(activity.timestamp)}
                      </Typography>
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
