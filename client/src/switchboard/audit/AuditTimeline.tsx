import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  List,
  ListItem,
  Stack,
  Typography,
} from '@mui/material';
import { getApiBaseUrl } from '../../config/urls';

type Outcome = 'success' | 'failure' | 'partial' | 'pending';

export interface CorrelatedAuditEvent {
  id: string;
  timestamp?: string;
  message?: string;
  action?: string;
  outcome?: Outcome;
  correlationId?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  resourcePath?: string;
  details?: Record<string, unknown>;
}

export interface AuditTimelineProps {
  correlationIds: string[];
  limit?: number;
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
  className?: string;
}

const defaultApiBase = getApiBaseUrl();

const getFallbackText = (value?: string) => value?.trim() || undefined;

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'Unknown time';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toISOString();
};

const buildDeepLink = (event: CorrelatedAuditEvent) => {
  if (event.resourcePath) {
    return {
      href: event.resourcePath,
      label:
        event.resourceName ||
        (event.resourceType && event.resourceId
          ? `${event.resourceType} ${event.resourceId}`
          : event.resourcePath),
    };
  }

  if (event.resourceType && event.resourceId) {
    return {
      href: `/resources/${event.resourceType}/${event.resourceId}`,
      label: `${event.resourceType} ${event.resourceId}`,
    };
  }

  if (event.correlationId) {
    return {
      href: `/audit?correlationId=${encodeURIComponent(event.correlationId)}`,
      label: `Correlation ${event.correlationId}`,
    };
  }

  return null;
};

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  correlationIds,
  limit = 25,
  apiBaseUrl,
  fetcher,
  className,
}) => {
  const [events, setEvents] = useState<CorrelatedAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = apiBaseUrl || defaultApiBase;
  const correlationKey = useMemo(
    () => correlationIds.filter(Boolean).join(','),
    [correlationIds],
  );

  useEffect(() => {
    if (!correlationKey) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          correlationIds: correlationKey,
        });

        const response = await (fetcher || fetch)(`${apiBase}/audit?${params}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setEvents(data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setEvents([]);
        setError((err as Error).message || 'Failed to load audit events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    return () => {
      controller.abort();
    };
  }, [apiBase, correlationKey, fetcher, limit]);

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const left = new Date(a.timestamp ?? 0).getTime();
        const right = new Date(b.timestamp ?? 0).getTime();
        return right - left;
      }),
    [events],
  );

  const hasCorrelation = Boolean(correlationKey);

  return (
    <Card className={className} variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Typography variant="h6">Audit timeline</Typography>
          {loading && <CircularProgress size={18} data-testid="audit-loading" />}
          {hasCorrelation && !loading && (
            <Chip label={`${sortedEvents.length} events`} size="small" />
          )}
        </Stack>

        {!hasCorrelation && (
          <Typography color="text.secondary">
            Provide correlation IDs to load correlated audit events.
          </Typography>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {hasCorrelation && !error && !loading && sortedEvents.length === 0 && (
          <Typography color="text.secondary">
            No correlated audit events were found.
          </Typography>
        )}

        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {sortedEvents.map((event) => {
            const link = buildDeepLink(event);
            const summary =
              getFallbackText(event.action) ||
              getFallbackText(event.message) ||
              'No details available';

            const detailText =
              getFallbackText(event.message) ||
              getFallbackText(event.details?.summary as string) ||
              'No additional context provided.';

            return (
              <ListItem key={event.id} alignItems="flex-start" divider>
                <Box display="flex" flexDirection="column" gap={0.5} width="100%">
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(event.timestamp)}
                  </Typography>
                  <Typography variant="subtitle2">{summary}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {detailText}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    {event.correlationId && (
                      <Chip
                        label={`Correlation ${event.correlationId}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {link ? (
                      <Link href={link.href} underline="hover" data-testid="resource-link">
                        {link.label}
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No resource link available
                      </Typography>
                    )}
                    {event.outcome && (
                      <Chip
                        label={event.outcome}
                        size="small"
                        color={
                          event.outcome === 'success'
                            ? 'success'
                            : event.outcome === 'failure'
                              ? 'error'
                              : 'warning'
                        }
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
};

export default AuditTimeline;
