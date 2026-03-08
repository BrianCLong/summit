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
exports.EventInspector = EventInspector;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const date_fns_1 = require("date-fns");
const MAX_EVENTS = 100;
function EventInspector() {
    const [events, setEvents] = (0, react_1.useState)([]);
    const [expanded, setExpanded] = (0, react_1.useState)({});
    const [enabled, setEnabled] = (0, react_1.useState)(() => import.meta.env.VITE_SHOW_EVENTS === '1' || import.meta.env.DEV);
    (0, react_1.useEffect)(() => {
        if (!enabled)
            return;
        const originalLog = console.log;
        const originalError = console.error;
        // Intercept Apollo Client logs (basic implementation)
        console.log = (...args) => {
            if (args[0]?.includes?.('GraphQL')) {
                const event = {
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
        console.error = (...args) => {
            if (args[0]?.networkError || args[0]?.graphQLErrors) {
                const event = {
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
    const toggleExpanded = (eventId) => {
        setExpanded((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
    };
    const clearEvents = () => {
        setEvents([]);
    };
    if (!import.meta.env.DEV && import.meta.env.VITE_SHOW_EVENTS !== '1') {
        return null;
    }
    return (<material_1.Card sx={{
            position: 'fixed',
            top: 80,
            right: 16,
            width: 320,
            maxHeight: 600,
            overflow: 'auto',
            zIndex: 9999,
        }}>
      <material_1.CardHeader avatar={<icons_material_1.BugReport />} title="Event Inspector" titleTypographyProps={{ variant: 'subtitle2' }} action={<material_1.Box sx={{ display: 'flex', alignItems: 'center' }}>
            <material_1.FormControlLabel control={<material_1.Switch size="small" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}/>} label="" sx={{ mr: 1 }}/>
            <material_1.IconButton size="small" onClick={clearEvents}>
              <icons_material_1.Clear fontSize="small"/>
            </material_1.IconButton>
          </material_1.Box>} sx={{ pb: 1 }}/>

      <material_1.CardContent sx={{ pt: 0 }}>
        <material_1.Typography variant="caption" color="text.secondary">
          {events.length} events (dev only)
        </material_1.Typography>

        <material_1.List dense>
          {events.map((event) => (<material_1.ListItem key={event.id} sx={{ p: 0.5 }}>
              <material_1.ListItemText primary={<material_1.Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                }} onClick={() => toggleExpanded(event.id)}>
                    <material_1.Chip size="small" label={event.type} color={event.error
                    ? 'error'
                    : event.type === 'subscription'
                        ? 'success'
                        : 'primary'} sx={{ fontSize: '0.6rem', height: 16 }}/>
                    <material_1.Typography variant="caption" noWrap>
                      {event.operation}
                    </material_1.Typography>
                    <icons_material_1.ExpandMore sx={{
                    fontSize: 16,
                    transform: expanded[event.id]
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                }}/>
                  </material_1.Box>} secondary={<material_1.Typography variant="caption" color="text.secondary">
                    {(0, date_fns_1.formatDistanceToNow)(event.timestamp, { addSuffix: true })}
                  </material_1.Typography>}/>

              <material_1.Collapse in={expanded[event.id]} sx={{ width: '100%' }}>
                <material_1.Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, mt: 0.5 }}>
                  <material_1.Typography variant="caption" component="pre" sx={{ fontSize: '0.6rem', overflow: 'auto' }}>
                    {JSON.stringify({
                data: event.data,
                variables: event.variables,
                error: event.error,
            }, null, 2)}
                  </material_1.Typography>
                </material_1.Box>
              </material_1.Collapse>
            </material_1.ListItem>))}
        </material_1.List>
      </material_1.CardContent>
    </material_1.Card>);
}
