"use strict";
/**
 * EventAnnotations - Overlay component for marking events on timeline
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
exports.EventAnnotations = void 0;
const react_1 = __importStar(require("react"));
const narrative_viz_types_1 = require("./types/narrative-viz-types");
const EventTooltip = ({ event, x, y }) => {
    return (<div className="absolute bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl z-50 pointer-events-none" style={{
            left: `${x + 10}px`,
            top: `${y - 60}px`,
            maxWidth: '250px',
        }}>
            <div className="text-xs font-semibold text-white mb-1">
                Tick {event.tick}
            </div>
            <div className="text-xs text-gray-400 mb-1">
                Type: <span className="text-white">{event.type}</span>
            </div>
            <div className="text-xs text-gray-300 mb-1">{event.description}</div>
            <div className="text-xs text-gray-400">
                Intensity:{' '}
                <span className="text-white">{(event.intensity * 100).toFixed(0)}%</span>
            </div>
            {event.theme && (<div className="text-xs text-gray-400 mt-1">
                    Theme: <span className="text-white">{event.theme}</span>
                </div>)}
        </div>);
};
const EventAnnotations = ({ events, chartWidth, chartHeight, xScale, onEventClick, }) => {
    const [hoveredEvent, setHoveredEvent] = (0, react_1.useState)(null);
    const [tooltipPos, setTooltipPos] = (0, react_1.useState)({
        x: 0,
        y: 0,
    });
    const handleEventHover = (event, e) => {
        setHoveredEvent(event);
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({ x: rect.left, y: rect.top });
    };
    const handleEventLeave = () => {
        setHoveredEvent(null);
    };
    return (<>
            <svg className="absolute top-0 left-0 pointer-events-none" width={chartWidth} height={chartHeight} style={{ zIndex: 10 }}>
                {events.map((event, index) => {
            const x = xScale(event.tick);
            const color = narrative_viz_types_1.EVENT_TYPE_COLORS[event.type] || '#6b7280';
            const opacity = 0.3 + event.intensity * 0.5; // Scale opacity by intensity
            return (<g key={event.id || index} className="pointer-events-auto cursor-pointer" onMouseEnter={(e) => handleEventHover(event, e)} onMouseLeave={handleEventLeave} onClick={() => onEventClick?.(event)}>
                            {/* Vertical line marker */}
                            <line x1={x} y1={0} x2={x} y2={chartHeight} stroke={color} strokeWidth={2} strokeOpacity={opacity} strokeDasharray="4 4"/>
                            {/* Circle marker at top */}
                            <circle cx={x} cy={20} r={4 + event.intensity * 4} fill={color} opacity={opacity} stroke="white" strokeWidth={1}/>
                        </g>);
        })}
            </svg>

            {/* Tooltip */}
            {hoveredEvent && (<EventTooltip event={hoveredEvent} x={tooltipPos.x} y={tooltipPos.y}/>)}
        </>);
};
exports.EventAnnotations = EventAnnotations;
