/**
 * Event Timeline - Chronological stream of operational events
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Skeleton,
  useTheme,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

export interface OperationalEvent {
  id: string;
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'INFO' | 'SUCCESS';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
  category: string;
  source: string;
  occurredAt: Date;
  assignedTo?: { id: string; name: string };
  correlatedEventsCount?: number;
}

export interface EventFilterState {
  severity?: string[];
  status?: string[];
  category?: string[];
  source?: string[];
  timeRange?: string;
  searchQuery?: string;
}

export interface EventTimelineProps {
  events: OperationalEvent[];
  filters: EventFilterState;
  onFilterChange: (filters: Partial<EventFilterState>) => void;
  onEventSelect: (eventId: string) => void;
  selectedEventId: string | null;
  isLoading?: boolean;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  filters,
  onFilterChange,
  onEventSelect,
  selectedEventId,
  isLoading = false,
}) => {
  const theme = useTheme();

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL':
        return theme.palette.error.main;
      case 'WARNING':
        return theme.palette.warning.main;
      case 'INFO':
        return theme.palette.info.main;
      case 'SUCCESS':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getSeverityIcon = (severity: string) => {
    const color = getSeverityColor(severity);
    const sx = { color, fontSize: 18 };
    switch (severity) {
      case 'CRITICAL':
        return <ErrorIcon sx={sx} />;
      case 'WARNING':
        return <WarningIcon sx={sx} />;
      case 'SUCCESS':
        return <SuccessIcon sx={sx} />;
      default:
        return <InfoIcon sx={sx} />;
    }
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const groupEventsByDate = (events: OperationalEvent[]) => {
    const groups: { [key: string]: OperationalEvent[] } = {};

    events.forEach((event) => {
      const date = new Date(event.occurredAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    });

    return groups;
  };

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Skeleton variant="text" width="30%" height={32} />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} sx={{ mt: 2, borderRadius: 1 }} />
        ))}
      </Paper>
    );
  }

  const groupedEvents = groupEventsByDate(events);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          📜 Event Timeline
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={filters.timeRange || '24h'}
              onChange={(e) => onFilterChange({ timeRange: e.target.value })}
              sx={{ height: 32 }}
            >
              <MenuItem value="1h">Last hour</MenuItem>
              <MenuItem value="4h">Last 4 hours</MenuItem>
              <MenuItem value="24h">Last 24 hours</MenuItem>
              <MenuItem value="7d">Last 7 days</MenuItem>
            </Select>
          </FormControl>

          <IconButton size="small">
            <FilterIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Event List */}
      <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
        {Object.entries(groupedEvents).map(([dateGroup, groupEvents]) => (
          <Box key={dateGroup}>
            {/* Date Divider */}
            <Box display="flex" alignItems="center" gap={1} my={2}>
              <Divider sx={{ flex: 1 }} />
              <Typography variant="caption" color="textSecondary" fontWeight={600}>
                {dateGroup}
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            {/* Events */}
            {groupEvents.map((event) => (
              <Box
                key={event.id}
                onClick={() => onEventSelect(event.id)}
                sx={{
                  p: 1.5,
                  mb: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor:
                    selectedEventId === event.id
                      ? theme.palette.action.selected
                      : 'transparent',
                  '&:hover': {
                    bgcolor: theme.palette.action.hover,
                  },
                  borderLeft: `3px solid ${getSeverityColor(event.severity)}`,
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1}>
                  {/* Time */}
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ minWidth: 70, pt: 0.25 }}
                  >
                    {formatTime(event.occurredAt)}
                  </Typography>

                  {/* Severity Icon */}
                  {getSeverityIcon(event.severity)}

                  {/* Content */}
                  <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip
                        size="small"
                        label={event.severity}
                        sx={{
                          height: 18,
                          fontSize: 10,
                          bgcolor: getSeverityColor(event.severity),
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {event.title}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="textSecondary" display="block">
                      {event.source}
                      {event.assignedTo && ` • @${event.assignedTo.name}`}
                    </Typography>

                    {/* Related events badge */}
                    {event.correlatedEventsCount && event.correlatedEventsCount > 0 && (
                      <Chip
                        size="small"
                        label={`Related: ${event.correlatedEventsCount} events`}
                        variant="outlined"
                        sx={{ mt: 0.5, height: 20, fontSize: 10 }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        ))}

        {events.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">No events found</Typography>
          </Box>
        )}
      </Box>

      {/* Load More */}
      {events.length > 0 && (
        <Box textAlign="center" mt={2}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            Load more events...
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default EventTimeline;
