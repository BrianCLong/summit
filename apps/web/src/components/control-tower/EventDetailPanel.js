"use strict";
/**
 * Event Detail Panel - Slide-out panel showing full event details
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventDetailPanel = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const DemoIndicator_1 = require("../common/DemoIndicator");
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
const EventDetailPanel = ({ eventId, open, onClose, }) => {
    const theme = (0, material_1.useTheme)();
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    // In real implementation, fetch event data based on eventId
    const event = eventId && isDemoMode ? mockEventData : null;
    const isLoading = false;
    const getSeverityColor = (severity) => {
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
    const getSeverityIcon = (severity) => {
        const sx = { fontSize: 24 };
        switch (severity) {
            case 'CRITICAL':
                return <icons_material_1.Error sx={{ ...sx, color: theme.palette.error.main }}/>;
            case 'WARNING':
                return <icons_material_1.Warning sx={{ ...sx, color: theme.palette.warning.main }}/>;
            case 'SUCCESS':
                return <icons_material_1.CheckCircle sx={{ ...sx, color: theme.palette.success.main }}/>;
            default:
                return <icons_material_1.Info sx={{ ...sx, color: theme.palette.info.main }}/>;
        }
    };
    const formatTime = (date) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };
    const formatDuration = (startDate) => {
        const diffMs = Date.now() - new Date(startDate).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        return `${diffMins} minutes (ongoing)`;
    };
    return (<material_1.Drawer anchor="right" open={open} onClose={onClose} PaperProps={{
            sx: { width: { xs: '100%', sm: 480 } },
        }}>
      {isLoading ? (<material_1.Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <material_1.CircularProgress />
        </material_1.Box>) : event ? (<material_1.Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <material_1.Box sx={{
                p: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
            <material_1.IconButton onClick={onClose} size="small">
              <icons_material_1.ArrowBack />
            </material_1.IconButton>
            <material_1.IconButton onClick={onClose} size="small">
              <icons_material_1.Close />
            </material_1.IconButton>
          </material_1.Box>

          {/* Content */}
          <material_1.Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {/* Event Header */}
            <material_1.Paper elevation={0} sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
            }}>
              <material_1.Box display="flex" alignItems="center" gap={1} mb={1}>
                <material_1.Chip icon={getSeverityIcon(event.severity)} label={`${event.severity} EVENT`} sx={{
                bgcolor: getSeverityColor(event.severity),
                color: 'white',
                fontWeight: 600,
            }}/>
              </material_1.Box>

              <material_1.Typography variant="h6" fontWeight={600} mb={1}>
                {event.title}
              </material_1.Typography>

              <material_1.Typography variant="body2" color="textSecondary" mb={2}>
                Source: {event.source}
                <br />
                Time: {formatTime(event.occurredAt)}
                <br />
                Duration: {formatDuration(event.occurredAt)}
              </material_1.Typography>

              {/* Status Cards */}
              <material_1.Box display="flex" gap={2}>
                <material_1.Box flex={1} textAlign="center" p={1} bgcolor={theme.palette.grey[50]} borderRadius={1}>
                  <material_1.Typography variant="caption" color="textSecondary">
                    SEVERITY
                  </material_1.Typography>
                  <material_1.Typography variant="body2" fontWeight={600} color={getSeverityColor(event.severity)}>
                    {event.severity}
                  </material_1.Typography>
                </material_1.Box>
                <material_1.Box flex={1} textAlign="center" p={1} bgcolor={theme.palette.grey[50]} borderRadius={1}>
                  <material_1.Typography variant="caption" color="textSecondary">
                    IMPACT
                  </material_1.Typography>
                  <material_1.Typography variant="body2" fontWeight={600}>
                    ${(event.metadata.impactEstimate.revenueAtRisk / 1000).toFixed(1)}K
                  </material_1.Typography>
                </material_1.Box>
                <material_1.Box flex={1} textAlign="center" p={1} bgcolor={theme.palette.grey[50]} borderRadius={1}>
                  <material_1.Typography variant="caption" color="textSecondary">
                    STATUS
                  </material_1.Typography>
                  <material_1.Typography variant="body2" fontWeight={600}>
                    {event.status}
                  </material_1.Typography>
                </material_1.Box>
              </material_1.Box>
            </material_1.Paper>

            {/* Details */}
            <material_1.Paper elevation={0} sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
            }}>
              <material_1.Typography variant="subtitle2" fontWeight={600} mb={1}>
                📋 Details
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary" mb={1}>
                Error: {event.metadata.errorDetails.code}
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary" mb={1}>
                Count: {event.metadata.errorDetails.count} failed transactions
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Error Rate: {event.metadata.errorDetails.errorRate}% (normal: &lt;0.1%)
              </material_1.Typography>
            </material_1.Paper>

            {/* Context Graph */}
            <material_1.Paper elevation={0} sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
            }}>
              <material_1.Box display="flex" alignItems="center" gap={1} mb={1}>
                <icons_material_1.AccountTree fontSize="small"/>
                <material_1.Typography variant="subtitle2" fontWeight={600}>
                  Context Graph
                </material_1.Typography>
              </material_1.Box>
              <material_1.Box display="flex" flexWrap="wrap" gap={1}>
                {event.relatedEntities.map((entity) => (<material_1.Chip key={entity.id} label={`${entity.type}: ${entity.name}`} size="small" variant="outlined"/>))}
              </material_1.Box>
              <material_1.Button size="small" sx={{ mt: 1 }}>
                Expand Graph View
              </material_1.Button>
            </material_1.Paper>

            {/* AI Suggestions */}
            <material_1.Paper elevation={0} sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
            }}>
              <material_1.Box display="flex" alignItems="center" gap={1} mb={1}>
                <icons_material_1.Lightbulb fontSize="small" color="primary"/>
                <material_1.Typography variant="subtitle2" fontWeight={600}>
                  AI Suggestions
                </material_1.Typography>
              </material_1.Box>
              <material_1.List dense disablePadding>
                {event.suggestions.map((suggestion, index) => (<material_1.ListItem key={suggestion.id} disablePadding sx={{ mb: 1 }}>
                    <material_1.ListItemText primary={`${index + 1}. ${suggestion.content}`} secondary={`→ ${suggestion.reasoning} (${Math.round(suggestion.confidence * 100)}% confidence)`} primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }}/>
                  </material_1.ListItem>))}
              </material_1.List>
            </material_1.Paper>

            {/* Timeline */}
            <material_1.Paper elevation={0} sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
            }}>
              <material_1.Box display="flex" alignItems="center" gap={1} mb={1}>
                <icons_material_1.History fontSize="small"/>
                <material_1.Typography variant="subtitle2" fontWeight={600}>
                  Related Timeline
                </material_1.Typography>
              </material_1.Box>
              <material_1.List dense disablePadding>
                {event.timeline.map((entry, index) => (<material_1.ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
                    <material_1.ListItemText primary={<material_1.Box display="flex" gap={1}>
                          <material_1.Typography variant="caption" color="textSecondary" sx={{ minWidth: 60 }}>
                            {entry.time}
                          </material_1.Typography>
                          <material_1.Typography variant="body2">{entry.description}</material_1.Typography>
                        </material_1.Box>}/>
                  </material_1.ListItem>))}
              </material_1.List>
            </material_1.Paper>

            {/* Governance */}
            <material_1.Paper elevation={0} sx={{
                p: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
            }}>
              <material_1.Box display="flex" alignItems="center" gap={1} mb={1}>
                <icons_material_1.Security fontSize="small"/>
                <material_1.Typography variant="subtitle2" fontWeight={600}>
                  Governance
                </material_1.Typography>
              </material_1.Box>
              <material_1.Typography variant="body2" color="textSecondary">
                Classification: {event.governance.sensitivity}
                <br />
                Retention: {event.governance.retentionClass}
                <br />
                Source: {event.governance.origin}
              </material_1.Typography>
            </material_1.Paper>
          </material_1.Box>

          {/* Actions Footer */}
          <material_1.Box sx={{
                p: 2,
                borderTop: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
            }}>
            <material_1.Button variant="contained" color="warning" size="small">
              🔔 Escalate
            </material_1.Button>
            <material_1.Button variant="outlined" size="small">
              👤 Reassign
            </material_1.Button>
            <material_1.Button variant="outlined" color="success" size="small">
              ✅ Resolve
            </material_1.Button>
            <material_1.Button variant="outlined" size="small">
              📋 Run Playbook
            </material_1.Button>
            <material_1.Button variant="outlined" size="small">
              💬 Comment
            </material_1.Button>
          </material_1.Box>
        </material_1.Box>) : (<material_1.Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <material_1.Typography color="textSecondary">Select an event to view details</material_1.Typography>
        </material_1.Box>)}
      {isDemoMode ? null : (<material_1.Box p={3}>
          <material_1.Typography variant="h6" gutterBottom>
            Event details unavailable
          </material_1.Typography>
          <material_1.Typography variant="body2" color="textSecondary">
            Connect the production data source to view live event details.
          </material_1.Typography>
        </material_1.Box>)}
    </material_1.Drawer>);
};
exports.EventDetailPanel = EventDetailPanel;
exports.default = exports.EventDetailPanel;
