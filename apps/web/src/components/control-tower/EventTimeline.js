"use strict";
/**
 * Event Timeline - Chronological stream of operational events
 */
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
exports.EventTimeline = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const EventTimeline = ({ events, filters, onFilterChange, onEventSelect, selectedEventId, isLoading = false, }) => {
    const theme = (0, material_1.useTheme)();
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
        const color = getSeverityColor(severity);
        const sx = { color, fontSize: 18 };
        switch (severity) {
            case 'CRITICAL':
                return <icons_material_1.Error sx={sx}/>;
            case 'WARNING':
                return <icons_material_1.Warning sx={sx}/>;
            case 'SUCCESS':
                return <icons_material_1.CheckCircle sx={sx}/>;
            default:
                return <icons_material_1.Info sx={sx}/>;
        }
    };
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };
    const groupedEvents = (0, react_1.useMemo)(() => {
        if (!events)
            return {};
        const groups = {};
        events.forEach((event) => {
            const date = new Date(event.occurredAt);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            let key;
            if (date.toDateString() === today.toDateString()) {
                key = 'Today';
            }
            else if (date.toDateString() === yesterday.toDateString()) {
                key = 'Yesterday';
            }
            else {
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
    }, [events]);
    if (isLoading) {
        return (<material_1.Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
        <material_1.Skeleton variant="text" width="30%" height={32}/>
        {[1, 2, 3, 4, 5].map((i) => (<material_1.Skeleton key={i} variant="rectangular" height={60} sx={{ mt: 2, borderRadius: 1 }}/>))}
      </material_1.Paper>);
    }
    return (<material_1.Paper elevation={0} sx={{
            p: 2,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
        }}>
      {/* Header */}
      <material_1.Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <material_1.Typography variant="h6" fontWeight={600}>
          📜 Event Timeline
        </material_1.Typography>

        <material_1.Box display="flex" alignItems="center" gap={1}>
          <material_1.FormControl size="small" sx={{ minWidth: 100 }}>
            <material_1.Select value={filters.timeRange || '24h'} onChange={(e) => onFilterChange({ timeRange: e.target.value })} sx={{ height: 32 }}>
              <material_1.MenuItem value="1h">Last hour</material_1.MenuItem>
              <material_1.MenuItem value="4h">Last 4 hours</material_1.MenuItem>
              <material_1.MenuItem value="24h">Last 24 hours</material_1.MenuItem>
              <material_1.MenuItem value="7d">Last 7 days</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>

          <material_1.IconButton size="small">
            <icons_material_1.FilterList fontSize="small"/>
          </material_1.IconButton>
        </material_1.Box>
      </material_1.Box>

      {/* Event List */}
      <material_1.Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
        {Object.entries(groupedEvents).map(([dateGroup, groupEvents]) => (<material_1.Box key={dateGroup}>
            {/* Date Divider */}
            <material_1.Box display="flex" alignItems="center" gap={1} my={2}>
              <material_1.Divider sx={{ flex: 1 }}/>
              <material_1.Typography variant="caption" color="textSecondary" fontWeight={600}>
                {dateGroup}
              </material_1.Typography>
              <material_1.Divider sx={{ flex: 1 }}/>
            </material_1.Box>

            {/* Events */}
            {groupEvents.map((event) => (<material_1.Box key={event.id} onClick={() => onEventSelect(event.id)} sx={{
                    p: 1.5,
                    mb: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: selectedEventId === event.id
                        ? theme.palette.action.selected
                        : 'transparent',
                    '&:hover': {
                        bgcolor: theme.palette.action.hover,
                    },
                    borderLeft: `3px solid ${getSeverityColor(event.severity)}`,
                }}>
                <material_1.Box display="flex" alignItems="flex-start" gap={1}>
                  {/* Time */}
                  <material_1.Typography variant="caption" color="textSecondary" sx={{ minWidth: 70, pt: 0.25 }}>
                    {formatTime(event.occurredAt)}
                  </material_1.Typography>

                  {/* Severity Icon */}
                  {getSeverityIcon(event.severity)}

                  {/* Content */}
                  <material_1.Box flex={1} minWidth={0}>
                    <material_1.Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <material_1.Chip size="small" label={event.severity} sx={{
                    height: 18,
                    fontSize: 10,
                    bgcolor: getSeverityColor(event.severity),
                    color: 'white',
                    fontWeight: 600,
                }}/>
                      <material_1.Typography variant="body2" fontWeight={500} noWrap>
                        {event.title}
                      </material_1.Typography>
                    </material_1.Box>

                    <material_1.Typography variant="caption" color="textSecondary" display="block">
                      {event.source}
                      {event.assignedTo && ` • @${event.assignedTo.name}`}
                    </material_1.Typography>

                    {/* Related events badge */}
                    {event.correlatedEventsCount && event.correlatedEventsCount > 0 && (<material_1.Chip size="small" label={`Related: ${event.correlatedEventsCount} events`} variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: 10 }}/>)}
                  </material_1.Box>
                </material_1.Box>
              </material_1.Box>))}
          </material_1.Box>))}

        {events.length === 0 && (<material_1.Box textAlign="center" py={4}>
            <material_1.Typography color="textSecondary">No events found</material_1.Typography>
          </material_1.Box>)}
      </material_1.Box>

      {/* Load More */}
      {events.length > 0 && (<material_1.Box textAlign="center" mt={2}>
          <material_1.Typography variant="body2" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            Load more events...
          </material_1.Typography>
        </material_1.Box>)}
    </material_1.Paper>);
};
exports.EventTimeline = EventTimeline;
exports.default = exports.EventTimeline;
