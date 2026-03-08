"use strict";
/**
 * Timeline Pane Component
 *
 * Displays events over time with time brush functionality.
 * Dragging/adjusting the time brush updates the global time window,
 * filtering data across all panes.
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
exports.TimelinePane = TimelinePane;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const AnalystViewContext_1 = require("./AnalystViewContext");
/**
 * TimelinePane component with time brush and event selection
 */
function TimelinePane({ events, className }) {
    const { state } = (0, AnalystViewContext_1.useAnalystView)();
    const { selection, setSelection } = (0, AnalystViewContext_1.useSelection)();
    const { timeWindow, setTimeWindow } = (0, AnalystViewContext_1.useGlobalTimeBrush)();
    const containerRef = (0, react_1.useRef)(null);
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [dragStart, setDragStart] = (0, react_1.useState)(null);
    // Parse time window
    const { startMs: fromTime, endMs: toTime } = timeWindow;
    const windowDuration = toTime - fromTime;
    // Filter events within time window and by event types
    const filteredEvents = (0, react_1.useMemo)(() => {
        let result = events.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            return eventTime >= fromTime && eventTime <= toTime;
        });
        // Filter by event types if specified
        if (state.filters.eventTypes && state.filters.eventTypes.length > 0) {
            result = result.filter(e => state.filters.eventTypes?.includes(e.type));
        }
        // Sort by timestamp
        return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [events, fromTime, toTime, state.filters.eventTypes]);
    // Calculate histogram buckets for the time brush visualization
    const histogram = (0, react_1.useMemo)(() => {
        const bucketCount = 50;
        const bucketDuration = windowDuration / bucketCount;
        const buckets = new Array(bucketCount).fill(0);
        events.forEach(event => {
            const eventTime = new Date(event.timestamp).getTime();
            if (eventTime >= fromTime && eventTime <= toTime) {
                const bucketIndex = Math.min(Math.floor((eventTime - fromTime) / bucketDuration), bucketCount - 1);
                buckets[bucketIndex]++;
            }
        });
        const maxCount = Math.max(...buckets, 1);
        return buckets.map(count => count / maxCount);
    }, [events, fromTime, toTime, windowDuration]);
    // Handle event click
    const handleEventClick = (0, react_1.useCallback)((event) => {
        setSelection({
            selectedEventIds: [event.id],
            selectedEntityIds: event.entityIds,
        });
    }, [setSelection]);
    // Handle time brush drag
    const handleMouseDown = (0, react_1.useCallback)((e) => {
        if (!containerRef.current)
            return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        setDragStart(percent);
        setIsDragging(true);
    }, []);
    const handleMouseMove = (0, react_1.useCallback)((e) => {
        if (!isDragging || dragStart === null || !containerRef.current)
            return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const start = Math.min(dragStart, percent);
        const end = Math.max(dragStart, percent);
        // Calculate new window times
        const newStartMs = fromTime + start * windowDuration;
        const newEndMs = fromTime + end * windowDuration;
        setTimeWindow({
            ...timeWindow,
            startMs: newStartMs,
            endMs: newEndMs,
        }, { source: 'timeline' });
    }, [isDragging, dragStart, fromTime, windowDuration, setTimeWindow, timeWindow]);
    const handleMouseUp = (0, react_1.useCallback)(() => {
        setIsDragging(false);
        setDragStart(null);
    }, []);
    // Shift time window
    const shiftTimeWindow = (0, react_1.useCallback)((direction) => {
        const shift = windowDuration * 0.25 * (direction === 'forward' ? 1 : -1);
        setTimeWindow({
            ...timeWindow,
            startMs: fromTime + shift,
            endMs: toTime + shift,
        }, { source: 'timeline-controls' });
    }, [fromTime, toTime, windowDuration, setTimeWindow, timeWindow]);
    // Get severity color
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'border-l-red-500 bg-red-950/20';
            case 'high':
                return 'border-l-orange-500 bg-orange-950/20';
            case 'medium':
                return 'border-l-yellow-500 bg-yellow-950/20';
            case 'low':
                return 'border-l-blue-500 bg-blue-950/20';
            default:
                return 'border-l-slate-500 bg-slate-950/20';
        }
    };
    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    return (<div className={(0, utils_1.cn)('flex flex-col h-full bg-slate-900', className)} role="region" aria-label="Timeline visualization">
      {/* Time brush header */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <lucide_react_1.Calendar className="h-4 w-4"/>
            <span>
              {new Date(timeWindow.startMs).toLocaleDateString()} -{' '}
              {new Date(timeWindow.endMs).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button_1.Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => shiftTimeWindow('backward')} aria-label="Shift time window backward">
              <lucide_react_1.ChevronLeft className="h-4 w-4"/>
            </Button_1.Button>
            <Button_1.Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => shiftTimeWindow('forward')} aria-label="Shift time window forward">
              <lucide_react_1.ChevronRight className="h-4 w-4"/>
            </Button_1.Button>
          </div>
        </div>

        {/* Histogram / Time brush */}
        <div ref={containerRef} className="relative h-12 bg-slate-800 rounded cursor-crosshair" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} role="slider" aria-label="Time brush selector" aria-valuemin={fromTime} aria-valuemax={toTime}>
          {/* Histogram bars */}
          <div className="absolute inset-0 flex items-end gap-px p-1">
            {histogram.map((height, i) => (<div key={i} className="flex-1 bg-blue-500/60 rounded-t transition-all" style={{ height: `${height * 100}%` }}/>))}
          </div>

          {/* Brush handles would go here in a more complete implementation */}
        </div>

        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{new Date(timeWindow.startMs).toLocaleTimeString()}</span>
          <span>{filteredEvents.length} events</span>
          <span>{new Date(timeWindow.endMs).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEvents.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-center">
            <lucide_react_1.Clock className="h-12 w-12 text-slate-600 mb-2"/>
            <p className="text-sm text-slate-400">No events in this time window</p>
            <p className="text-xs text-slate-500 mt-1">
              Adjust the time range to see events
            </p>
          </div>) : (filteredEvents.map(event => {
            const isSelected = selection.selectedEventIds.includes(event.id);
            return (<div key={event.id} className={(0, utils_1.cn)('border-l-4 rounded-r-lg p-3 cursor-pointer transition-all', getSeverityColor(event.severity), isSelected && 'ring-2 ring-yellow-400', 'hover:bg-slate-800/50')} onClick={() => handleEventClick(event)} role="button" tabIndex={0} aria-label={`Event: ${event.summary}`} aria-selected={isSelected} onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEventClick(event);
                    }
                }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge_1.Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge_1.Badge>
                      {event.severity && (<Badge_1.Badge variant={event.severity === 'critical' ||
                        event.severity === 'high'
                        ? 'destructive'
                        : 'secondary'} className="text-xs">
                          {event.severity}
                        </Badge_1.Badge>)}
                    </div>
                    <p className="text-sm text-slate-200 line-clamp-2">
                      {event.summary}
                    </p>
                    {event.entityIds.length > 0 && (<p className="text-xs text-slate-500 mt-1">
                        {event.entityIds.length} entities involved
                      </p>)}
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {formatTime(event.timestamp)}
                  </div>
                </div>
              </div>);
        }))}
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredEvents.length} of {events.length} events</span>
          {selection.selectedEventIds.length > 0 && (<Badge_1.Badge variant="secondary" className="text-xs">
              {selection.selectedEventIds.length} selected
            </Badge_1.Badge>)}
        </div>
      </div>
    </div>);
}
