/**
 * EventAnnotations - Overlay component for marking events on timeline
 */

import React, { useState } from 'react';
import type { EventMarker } from './types/narrative-viz-types';
import { EVENT_TYPE_COLORS } from './types/narrative-viz-types';

interface EventAnnotationsProps {
    events: EventMarker[];
    chartWidth: number;
    chartHeight: number;
    xScale: (tick: number) => number;
    onEventClick?: (event: EventMarker) => void;
}

interface EventTooltipProps {
    event: EventMarker;
    x: number;
    y: number;
}

const EventTooltip: React.FC<EventTooltipProps> = ({ event, x, y }) => {
    return (
        <div
            className="absolute bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl z-50 pointer-events-none"
            style={{
                left: `${x + 10}px`,
                top: `${y - 60}px`,
                maxWidth: '250px',
            }}
        >
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
            {event.theme && (
                <div className="text-xs text-gray-400 mt-1">
                    Theme: <span className="text-white">{event.theme}</span>
                </div>
            )}
        </div>
    );
};

export const EventAnnotations: React.FC<EventAnnotationsProps> = ({
    events,
    chartWidth,
    chartHeight,
    xScale,
    onEventClick,
}) => {
    const [hoveredEvent, setHoveredEvent] = useState<EventMarker | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    const handleEventHover = (
        event: EventMarker,
        e: React.MouseEvent<SVGGElement>,
    ) => {
        setHoveredEvent(event);
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({ x: rect.left, y: rect.top });
    };

    const handleEventLeave = () => {
        setHoveredEvent(null);
    };

    return (
        <>
            <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={chartWidth}
                height={chartHeight}
                style={{ zIndex: 10 }}
            >
                {events.map((event, index) => {
                    const x = xScale(event.tick);
                    const color = (EVENT_TYPE_COLORS as any)[event.type] || '#6b7280';
                    const opacity = 0.3 + event.intensity * 0.5; // Scale opacity by intensity

                    return (
                        <g
                            key={event.id || index}
                            className="pointer-events-auto cursor-pointer"
                            onMouseEnter={(e) => handleEventHover(event, e)}
                            onMouseLeave={handleEventLeave}
                            onClick={() => onEventClick?.(event)}
                        >
                            {/* Vertical line marker */}
                            <line
                                x1={x}
                                y1={0}
                                x2={x}
                                y2={chartHeight}
                                stroke={color}
                                strokeWidth={2}
                                strokeOpacity={opacity}
                                strokeDasharray="4 4"
                            />
                            {/* Circle marker at top */}
                            <circle
                                cx={x}
                                cy={20}
                                r={4 + event.intensity * 4}
                                fill={color}
                                opacity={opacity}
                                stroke="white"
                                strokeWidth={1}
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {hoveredEvent && (
                <EventTooltip
                    event={hoveredEvent}
                    x={tooltipPos.x}
                    y={tooltipPos.y}
                />
            )}
        </>
    );
};
