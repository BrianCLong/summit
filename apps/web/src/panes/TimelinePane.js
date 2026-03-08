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
exports.TimelinePane = void 0;
const react_1 = __importStar(require("react"));
const recharts_1 = require("recharts");
const workspaceStore_1 = require("../store/workspaceStore");
const TimelinePane = () => {
    const { allEntities, selectedEntityIds, selectEntity, timeWindow, setTimeWindow } = (0, workspaceStore_1.useWorkspaceStore)();
    // Transform entities into timeline events
    // Use allEntities to show context, but highlight/filter based on timeWindow
    const data = (0, react_1.useMemo)(() => {
        return allEntities
            .filter(e => e.timestamp)
            .map((e, index) => ({
            ...e,
            time: new Date(e.timestamp).getTime(),
            yValue: index % 3, // Simple staggering to avoid overlap
        }))
            .sort((a, b) => a.time - b.time);
    }, [allEntities]);
    const formatTime = (time) => {
        return new Date(time).toLocaleDateString();
    };
    const handlePointClick = (data) => {
        if (data && data.payload) {
            selectEntity(data.payload.id);
        }
    };
    // Brush/Drag Selection State
    const [dragStart, setDragStart] = (0, react_1.useState)(null);
    const [dragEnd, setDragEnd] = (0, react_1.useState)(null);
    const handleMouseDown = (e) => {
        if (e && e.activeLabel) {
            setDragStart(e.activeLabel);
        }
    };
    const handleMouseMove = (e) => {
        if (dragStart && e && e.activeLabel) {
            setDragEnd(e.activeLabel);
        }
    };
    const handleMouseUp = () => {
        if (dragStart && dragEnd) {
            const start = Math.min(dragStart, dragEnd);
            const end = Math.max(dragStart, dragEnd);
            // Ensure minimum window size or just set it
            if (start !== end) {
                setTimeWindow(start, end);
            }
        }
        setDragStart(null);
        setDragEnd(null);
    };
    // Accessibility: Keyboard handlers
    const handleKeyDown = (e) => {
        const SHIFT_STEP = 10;
        const STEP_MS = 60 * 60 * 1000; // 1 Hour step for now
        if (e.key === 'ArrowLeft') {
            const delta = e.shiftKey ? STEP_MS * SHIFT_STEP : STEP_MS;
            setTimeWindow(timeWindow.startMs - delta, timeWindow.endMs - delta);
        }
        else if (e.key === 'ArrowRight') {
            const delta = e.shiftKey ? STEP_MS * SHIFT_STEP : STEP_MS;
            setTimeWindow(timeWindow.startMs + delta, timeWindow.endMs + delta);
        }
    };
    // Screen reader announcement
    (0, react_1.useEffect)(() => {
        const message = `Time range: ${new Date(timeWindow.startMs).toLocaleString()} to ${new Date(timeWindow.endMs).toLocaleString()}, ${timeWindow.tzMode}`;
        // In a real app, use a live region to announce this
        const region = document.getElementById('a11y-live-region');
        if (region)
            region.innerText = message;
    }, [timeWindow]);
    // Visualize the selected window
    // If drag is active, show that. Else show timeWindow.
    const refAreaLeft = dragStart && dragEnd ? Math.min(dragStart, dragEnd) : timeWindow.startMs;
    const refAreaRight = dragStart && dragEnd ? Math.max(dragStart, dragEnd) : timeWindow.endMs;
    return (<div className="w-full h-full relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col p-4" tabIndex={0} onKeyDown={handleKeyDown} role="region" aria-label="Timeline. Use arrow keys to move time window.">
      <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-emerald-400 border border-emerald-900/50">
        TEMPORAL EVENTS
      </div>
      <div className="flex-1 mt-6 select-none">
      <recharts_1.ResponsiveContainer width="100%" height="100%">
        <recharts_1.ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
          <recharts_1.XAxis type="number" dataKey="time" name="Time" domain={['auto', 'auto']} tickFormatter={formatTime} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }}/>
          <recharts_1.YAxis type="number" dataKey="yValue" name="Stagger" hide/>
          <recharts_1.ZAxis type="number" range={[60, 400]}/>
          <recharts_1.Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} labelFormatter={(value) => new Date(value).toLocaleString()}/>
          <recharts_1.Scatter name="Events" data={data} onClick={handlePointClick} cursor="pointer">
            {data.map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={selectedEntityIds.includes(entry.id) ? '#22d3ee' : '#10b981'} opacity={(entry.time >= refAreaLeft && entry.time <= refAreaRight) ? 1 : 0.3}/>))}
          </recharts_1.Scatter>

          <recharts_1.ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#22d3ee" fillOpacity={0.1}/>

          {/* Add current time line or other reference lines if needed */}
        </recharts_1.ScatterChart>
      </recharts_1.ResponsiveContainer>
      </div>
      <div id="a11y-live-region" className="sr-only" aria-live="polite"></div>
    </div>);
};
exports.TimelinePane = TimelinePane;
