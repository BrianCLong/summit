import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Box,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { ExpandMore, Clear, BugReport } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface RealtimeEvent {
  id: string;
  type: 'subscription' | 'mutation' | 'query';
  operation: string;
  timestamp: Date;
  data: any;
  variables?: any;
  error?: any;
}

const MAX_EVENTS = 100;

export function EventInspector() {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [enabled, setEnabled] = useState(
    () => import.meta.env.VITE_SHOW_EVENTS === '1' || import.meta.env.DEV,
  );

  useEffect(() => {
    if (!enabled) return;

    const originalLog = console.log;
    const originalError = console.error;

    // Intercept Apollo Client logs (basic implementation)
    console.log = (...args: any[]) => {
      if (args[0]?.includes?.('GraphQL')) {
        const event: RealtimeEvent = {
          id: Math.random().toString(36),
          type: 'query',
          operation: 'unknown',
          timestamp: new Date(),
          data: args,
        };

        setEvents((prev) => [event, ...prev.slice(0, MAX_EVENTS - 1)]);
      }
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      if (args[0]?.networkError || args[0]?.graphQLErrors) {
        const event: RealtimeEvent = {
          id: Math.random().toString(36),
          type: 'mutation',
          operation: 'error',
          timestamp: new Date(),
          data: null,
          error: args[0],
        };

        setEvents((prev) => [event, ...prev.slice(0, MAX_EVENTS - 1)]);
      }
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [enabled]);

  const toggleExpanded = (eventId: string) => {
    setExpanded((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const clearEvents = () => {
    setEvents([]);
  };

  if (!import.meta.env.DEV && import.meta.env.VITE_SHOW_EVENTS !== '1') {
    return null;
  }

  return (
    <Card
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        width: 320,
        maxHeight: 600,
        overflow: 'auto',
        zIndex: 9999,
      }}
    >
      <CardHeader
        avatar={<BugReport />}
        title="Event Inspector"
        titleTypographyProps={{ variant: 'subtitle2' }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              }
              label=""
              sx={{ mr: 1 }}
            />
            <IconButton size="small" onClick={clearEvents}>
              <Clear fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {events.length} events (dev only)
        </Typography>

        <List dense>
          {events.map((event) => (
            <ListItem key={event.id} sx={{ p: 0.5 }}>
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleExpanded(event.id)}
                  >
                    <Chip
                      size="small"
                      label={event.type}
                      color={
                        event.error
                          ? 'error'
                          : event.type === 'subscription'
                            ? 'success'
                            : 'primary'
                      }
                      sx={{ fontSize: '0.6rem', height: 16 }}
                    />
                    <Typography variant="caption" noWrap>
                      {event.operation}
                    </Typography>
                    <ExpandMore
                      sx={{
                        fontSize: 16,
                        transform: expanded[event.id]
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                  </Typography>
                }
              />

              <Collapse in={expanded[event.id]} sx={{ width: '100%' }}>
                <Box
                  sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, mt: 0.5 }}
                >
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{ fontSize: '0.6rem', overflow: 'auto' }}
                  >
                    {JSON.stringify(
                      {
                        data: event.data,
                        variables: event.variables,
                        error: event.error,
                      },
                      null,
                      2,
                    )}
                  </Typography>
                </Box>
              </Collapse>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
