import React from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { gql, useQuery } from '@apollo/client';

const ACTIVITY_FEED_QUERY = gql`
  query ActivityFeedData {
    serverStats {
      uptime
      totalInvestigations
      totalEntities
    }
  }
`;

interface ActivityFeedProps {
  filters?: {
    types?: string[];
    targetIds?: string[];
  };
  maxItems?: number;
}

const ACTION_COLORS = {
  created: 'success',
  updated: 'info',
  deleted: 'error',
  viewed: 'default',
  shared: 'secondary',
  exported: 'warning',
} as const;

export function ActivityFeed({ filters, maxItems = 50 }: ActivityFeedProps) {
  // Fallback to a lightweight query with polling; replace with subscription when available
  const { data, loading } = useQuery(ACTIVITY_FEED_QUERY, {
    pollInterval: 10000,
  });
  const activities: Array<any> = (data?.activityFeed ?? []).slice(0, maxItems);

  if (loading && activities.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Activity Feed
        </Typography>
        <Typography color="text.secondary">
          Loading recent activity...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Live Activity Feed
        {activities.length > 0 && (
          <Chip size="small" label={activities.length} sx={{ ml: 1 }} />
        )}
      </Typography>

      {activities.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No recent activity
        </Typography>
      ) : (
        <List dense>
          {activities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {activity.actor?.displayName?.charAt(0).toUpperCase() ||
                      '?'}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" component="span">
                        {activity.actor?.displayName || 'Unknown User'}
                      </Typography>
                      <Chip
                        size="small"
                        label={activity.action}
                        color={
                          ACTION_COLORS[
                            activity.action as keyof typeof ACTION_COLORS
                          ] || 'default'
                        }
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        component="span"
                      >
                        {activity.target?.name}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}
                      {activity.target?.type && (
                        <Chip
                          size="small"
                          label={activity.target.type}
                          variant="outlined"
                          sx={{ ml: 1, height: 16, fontSize: '0.6rem' }}
                        />
                      )}
                    </Typography>
                  }
                />
              </ListItem>

              {index < activities.length - 1 && (
                <Divider variant="inset" component="li" />
              )}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
}
