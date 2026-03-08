/**
 * NarrativeArcChart - Visualizes narrative momentum over time
 */

import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    TooltipProps,
} from 'recharts';
import type {
    ArcDataPoint,
    ChartConfig,
} from './types/narrative-viz-types';
import { DEFAULT_THEME_COLORS } from './types/narrative-viz-types';

interface NarrativeArcChartProps {
    arcs: ArcDataPoint[];
    currentTick: number;
    config?: Partial<ChartConfig>;
    className?: string;
}

/**
 * Custom tooltip showing arc details
 */
const ArcTooltip: React.FC<TooltipProps<number, string>> = ({
    active,
    payload,
}) => {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
            <p className="text-sm font-semibold text-white mb-2">
                Tick {payload[0]?.payload?.tick || 0}
            </p>
            {payload.map((entry: any, index: number) => (
                <div key={index} className="text-xs mb-1">
                    <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-300">{entry.name}:</span>
                    <span className="text-white font-medium ml-1">
                        {(entry.value * 100).toFixed(1)}%
                    </span>
                    {entry.payload[`${entry.name}_outlook`] && (
                        <span className="text-gray-400 ml-2 text-xs">
                            ({entry.payload[`${entry.name}_outlook`]})
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

export const NarrativeArcChart: React.FC<NarrativeArcChartProps> = ({
    arcs,
    currentTick,
    config,
    className = '',
}) => {
    // Transform arc data for Recharts
    const chartData = useMemo(() => {
        // For now, we only have current state, not historical data
        // In a full implementation, we'd have tick-by-tick history
        const data = [
            {
                tick: currentTick,
                ...arcs.reduce((acc, arc) => {
                    acc[arc.theme] = arc.momentum;
                    acc[`${arc.theme}_outlook`] = arc.outlook;
                    acc[`${arc.theme}_entities`] = arc.keyEntities.join(', ');
                    return acc;
                }, {} as Record<string, any>),
            },
        ];

        // Add a zero point for better visualization
        if (currentTick > 0) {
            data.unshift({
                tick: 0,
                ...arcs.reduce((acc, arc) => {
                    acc[arc.theme] = 0;
                    return acc;
                }, {} as Record<string, any>),
            });
        }

        return data;
    }, [arcs, currentTick]);

    // Get theme colors
    const themeColors = useMemo(() => {
        const colors: Record<string, string> = {};
        arcs.forEach((arc, index) => {
            colors[arc.theme] =
                config?.colors?.[arc.theme] ||
                (DEFAULT_THEME_COLORS as any)[arc.theme] ||
                `hsl(${(index * 360) / arcs.length}, 70%, 50%)`;
        });
        return colors;
    }, [arcs, config?.colors]);

    // Filter themes if specified in config
    const visibleThemes = useMemo(() => {
        if (config?.themes && config.themes.length > 0) {
            return arcs.filter((arc) => config.themes!.includes(arc.theme));
        }
        return arcs;
    }, [arcs, config?.themes]);

    return (
        <div className={`w-full ${className}`}>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                        dataKey="tick"
                        stroke="#9ca3af"
                        label={{ value: 'Simulation Tick', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        label={{ value: 'Momentum', angle: -90, position: 'insideLeft' }}
                        domain={[0, 1]}
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    />
                    <Tooltip content={<ArcTooltip />} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                    />
                    {visibleThemes.map((arc) => (
                        <Line
                            key={arc.theme}
                            type="monotone"
                            dataKey={arc.theme}
                            stroke={themeColors[arc.theme]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            name={arc.theme}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>

            {/* Arc Details */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleThemes.map((arc) => (
                    <div
                        key={arc.theme}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-3"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: themeColors[arc.theme] }}
                                />
                                <h4 className="text-sm font-semibold text-white">
                                    {arc.theme}
                                </h4>
                            </div>
                            <span
                                className={`text-xs px-2 py-1 rounded ${arc.outlook === 'improving'
                                    ? 'bg-green-900 text-green-300'
                                    : arc.outlook === 'degrading'
                                        ? 'bg-red-900 text-red-300'
                                        : 'bg-gray-700 text-gray-300'
                                    }`}
                            >
                                {arc.outlook}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                            Momentum: <span className="text-white font-medium">
                                {(arc.momentum * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                            Confidence: <span className="text-white font-medium">
                                {(arc.confidence * 100).toFixed(1)}%
                            </span>
                        </div>
                        {arc.keyEntities.length > 0 && (
                            <div className="text-xs text-gray-400">
                                Key: <span className="text-gray-300">
                                    {arc.keyEntities.slice(0, 2).join(', ')}
                                    {arc.keyEntities.length > 2 && ` +${arc.keyEntities.length - 2}`}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
