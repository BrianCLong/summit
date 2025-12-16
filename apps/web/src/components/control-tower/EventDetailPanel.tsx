/**
 * Event Detail Panel - Slide-out panel showing full event details
 */

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Button,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as BackIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  AccountTree as GraphIcon,
  Lightbulb as SuggestionIcon,
  Security as GovernanceIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

export interface EventDetailPanelProps {
  eventId: string | null;
  open: boolean;
  onClose: () => void;
}

// Mock data for demo
const mockEventData = {
  id: '1',
  title: 'Payment webhook failures detected',
  description: 'Stripe webhook endpoint returning 500 errors for checkout events',
  severity: 'CRITICAL',
  status: 'INVESTIGATING',
  category: 'PAYMENT',
  source: 'Stripe Integration',
  sourceUrl: 'https://dashboard.stripe.com/webhooks',
  occurredAt: new Date(Date.now() - 23 * 60 * 1000),
  assignedTo: { id: '1', name: 'mike' },
  metadata: {
    impactEstimate: {
      revenueAtRisk: 12340,
      customersAffected: 12,
    },
    errorDetails: {
      code: 'webhook_endpoint_failure',
      message: 'connection_timeout',
      count: 47,
      errorRate: 12.3,
    },
  },
  relatedEntities: [
    { id: '1', type: 'System', name: 'Stripe', relationshipType: 'SOURCE' },
    { id: '2', type: 'Customer', name: '12 Customers', relationshipType: 'AFFECTED' },
    { id: '3', type: 'Ticket', name: 'Support Tickets', relationshipType: 'DOWNSTREAM' },
  ],
  suggestions: [
    {
      id: '1',
      type: 'diagnostic',
      content: 'Check Stripe API status page',
      confidence: 0.92,
      reasoning: 'Status shows degraded performance',
    },
    {
      id: '2',
      type: 'investigation',
      content: 'Review recent deployment changes',
      confidence: 0.78,
      reasoning: 'v2.4.1 deployed 49 min ago',
    },
    {
      id: '3',
      type: 'remediation',
      content: 'Increase webhook timeout threshold',
      confidence: 0.65,
      reasoning: 'Similar issue resolved in INC-234',
    },
  ],
  timeline: [
    { time: '2:34 PM', description: 'Event triggered' },
    { time: '2:35 PM', description: 'Auto-alert sent to #ops-critical' },
    { time: '2:36 PM', description: '@mike acknowledged' },
    { time: '2:38 PM', description: 'Status: Investigating' },
    { time: '2:41 PM', description: '3 support tickets opened' },
    { time: '2:45 PM', description: 'Runbook triggered: payment_debug' },
  ],
  governance: {
    origin: 'Stripe API',
    sensitivity: 'Internal',
    clearance: 'Standard',
    retentionClass: '90 days',
    policyLabels: ['ops-events-standard'],
  },
};

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  eventId,
  open,
  onClose,
}) => {
  const theme = useTheme();

  // In real implementation, fetch event data based on eventId
  const event = eventId ? mockEventData : null;
  const isLoading = false;

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
    const sx = { fontSize: 24 };
    switch (severity) {
      case 'CRITICAL':
        return <ErrorIcon sx={{ ...sx, color: theme.palette.error.main }} />;
      case 'WARNING':
        return <WarningIcon sx={{ ...sx, color: theme.palette.warning.main }} />;
      case 'SUCCESS':
        return <SuccessIcon sx={{ ...sx, color: theme.palette.success.main }} />;
      default:
        return <InfoIcon sx={{ ...sx, color: theme.palette.info.main }} />;
    }
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (startDate: Date): string => {
    const diffMs = Date.now() - new Date(startDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins} minutes (ongoing)`;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 } },
      }}
    >
      {isLoading ? (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <CircularProgress />
        </Box>
      ) : event ? (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <IconButton onClick={onClose} size="small">
              <BackIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {/* Event Header */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Chip
                  icon={getSeverityIcon(event.severity)}
                  label={`${event.severity} EVENT`}
                  sx={{
                    bgcolor: getSeverityColor(event.severity),
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>

              <Typography variant="h6" fontWeight={600} mb={1}>
                {event.title}
              </Typography>

              <Typography variant="body2" color="textSecondary" mb={2}>
                Source: {event.source}
                <br />
                Time: {formatTime(event.occurredAt)}
                <br />
                Duration: {formatDuration(event.occurredAt)}
              </Typography>

              {/* Status Cards */}
              <Box display="flex" gap={2}>
                <Box flex={1} textAlign="center" p={1} bgcolor={theme.palette.grey[50]} borderRadius={1}>
                  <Typography variant="caption" color="textSecondary">
                    SEVERITY
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color={getSeverityColor(event.severity)}>
                    {event.severity}
                  </Typography>
                </Box>
                <Box flex={1} textAlign="center" p={1} bgcolor={theme.palette.grey[50]} borderRadius={1}>
                  <Typography variant="caption" color="textSecondary">
                    IMPACT
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${(event.metadata.impactEstimate.revenueAtRisk / 1000).toFixed(1)}K
                  </Typography>
                </Box>
                <Box flex={1} textAlign="center" p={1} bgcolor={theme.palette.grey[50]} borderRadius={1}>
                  <Typography variant="caption" color="textSecondary">
                    STATUS
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {event.status}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Details */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                📋 Details
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={1}>
                Error: {event.metadata.errorDetails.code}
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={1}>
                Count: {event.metadata.errorDetails.count} failed transactions
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Error Rate: {event.metadata.errorDetails.errorRate}% (normal: &lt;0.1%)
              </Typography>
            </Paper>

            {/* Context Graph */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <GraphIcon fontSize="small" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Context Graph
                </Typography>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {event.relatedEntities.map((entity) => (
                  <Chip
                    key={entity.id}
                    label={`${entity.type}: ${entity.name}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
              <Button size="small" sx={{ mt: 1 }}>
                Expand Graph View
              </Button>
            </Paper>

            {/* AI Suggestions */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <SuggestionIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  AI Suggestions
                </Typography>
              </Box>
              <List dense disablePadding>
                {event.suggestions.map((suggestion, index) => (
                  <ListItem key={suggestion.id} disablePadding sx={{ mb: 1 }}>
                    <ListItemText
                      primary={`${index + 1}. ${suggestion.content}`}
                      secondary={`→ ${suggestion.reasoning} (${Math.round(suggestion.confidence * 100)}% confidence)`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Timeline */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <HistoryIcon fontSize="small" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Related Timeline
                </Typography>
              </Box>
              <List dense disablePadding>
                {event.timeline.map((entry, index) => (
                  <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" gap={1}>
                          <Typography variant="caption" color="textSecondary" sx={{ minWidth: 60 }}>
                            {entry.time}
                          </Typography>
                          <Typography variant="body2">{entry.description}</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Governance */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <GovernanceIcon fontSize="small" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Governance
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Classification: {event.governance.sensitivity}
                <br />
                Retention: {event.governance.retentionClass}
                <br />
                Source: {event.governance.origin}
              </Typography>
            </Paper>
          </Box>

          {/* Actions Footer */}
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Button variant="contained" color="warning" size="small">
              🔔 Escalate
            </Button>
            <Button variant="outlined" size="small">
              👤 Reassign
            </Button>
            <Button variant="outlined" color="success" size="small">
              ✅ Resolve
            </Button>
            <Button variant="outlined" size="small">
              📋 Run Playbook
            </Button>
            <Button variant="outlined" size="small">
              💬 Comment
            </Button>
          </Box>
        </Box>
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <Typography color="textSecondary">Select an event to view details</Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default EventDetailPanel;
