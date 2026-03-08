"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTimeline = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const urls_1 = require("../../config/urls");
const defaultApiBase = (0, urls_1.getApiBaseUrl)();
const getFallbackText = (value) => value?.trim() || undefined;
const formatTimestamp = (timestamp) => {
    if (!timestamp)
        return 'Unknown time';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime()))
        return 'Unknown time';
    return date.toISOString();
};
const buildDeepLink = (event) => {
    if (event.resourcePath) {
        return {
            href: event.resourcePath,
            label: event.resourceName ||
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
const AuditTimeline = ({ correlationIds, limit = 25, apiBaseUrl, fetcher, className, }) => {
    const [events, setEvents] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const apiBase = apiBaseUrl || defaultApiBase;
    const correlationKey = (0, react_1.useMemo)(() => correlationIds.filter(Boolean).join(','), [correlationIds]);
    (0, react_1.useEffect)(() => {
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
            }
            catch (err) {
                if (err.name === 'AbortError')
                    return;
                setEvents([]);
                setError(err.message || 'Failed to load audit events');
            }
            finally {
                setLoading(false);
            }
        };
        fetchEvents();
        return () => {
            controller.abort();
        };
    }, [apiBase, correlationKey, fetcher, limit]);
    const sortedEvents = (0, react_1.useMemo)(() => [...events].sort((a, b) => {
        const left = new Date(a.timestamp ?? 0).getTime();
        const right = new Date(b.timestamp ?? 0).getTime();
        return right - left;
    }), [events]);
    const hasCorrelation = Boolean(correlationKey);
    return (<material_1.Card className={className} variant="outlined">
      <material_1.CardContent>
        <material_1.Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <material_1.Typography variant="h6">Audit timeline</material_1.Typography>
          {loading && <material_1.CircularProgress size={18} data-testid="audit-loading"/>}
          {hasCorrelation && !loading && (<material_1.Chip label={`${sortedEvents.length} events`} size="small"/>)}
        </material_1.Stack>

        {!hasCorrelation && (<material_1.Typography color="text.secondary">
            Provide correlation IDs to load correlated audit events.
          </material_1.Typography>)}

        {error && <material_1.Alert severity="error">{error}</material_1.Alert>}

        {hasCorrelation && !error && !loading && sortedEvents.length === 0 && (<material_1.Typography color="text.secondary">
            No correlated audit events were found.
          </material_1.Typography>)}

        <material_1.List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {sortedEvents.map((event) => {
            const link = buildDeepLink(event);
            const summary = getFallbackText(event.action) ||
                getFallbackText(event.message) ||
                'No details available';
            const detailText = getFallbackText(event.message) ||
                getFallbackText(event.details?.summary) ||
                'No additional context provided.';
            return (<material_1.ListItem key={event.id} alignItems="flex-start" divider>
                <material_1.Box display="flex" flexDirection="column" gap={0.5} width="100%">
                  <material_1.Typography variant="caption" color="text.secondary">
                    {formatTimestamp(event.timestamp)}
                  </material_1.Typography>
                  <material_1.Typography variant="subtitle2">{summary}</material_1.Typography>
                  <material_1.Typography variant="body2" color="text.secondary">
                    {detailText}
                  </material_1.Typography>
                  <material_1.Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    {event.correlationId && (<material_1.Chip label={`Correlation ${event.correlationId}`} size="small" color="primary" variant="outlined"/>)}
                    {link ? (<material_1.Link href={link.href} underline="hover" data-testid="resource-link">
                        {link.label}
                      </material_1.Link>) : (<material_1.Typography variant="body2" color="text.secondary">
                        No resource link available
                      </material_1.Typography>)}
                    {event.outcome && (<material_1.Chip label={event.outcome} size="small" color={event.outcome === 'success'
                        ? 'success'
                        : event.outcome === 'failure'
                            ? 'error'
                            : 'warning'} variant="outlined"/>)}
                  </material_1.Box>
                </material_1.Box>
              </material_1.ListItem>);
        })}
        </material_1.List>
      </material_1.CardContent>
    </material_1.Card>);
};
exports.AuditTimeline = AuditTimeline;
exports.default = exports.AuditTimeline;
