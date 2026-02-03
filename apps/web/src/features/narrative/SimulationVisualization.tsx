/**
 * SimulationVisualization - Container component for narrative visualization
 */

import React, { useState, useEffect } from 'react';
import { NarrativeArcChart } from './NarrativeArcChart';
import { EventAnnotations } from './EventAnnotations';
import {
    getSimulationVisualizationData,
} from './api';
import type {
    EventMarker,
    ChartConfig,
} from './types/narrative-viz-types';

interface SimulationVisualizationProps {
    simulationId: string;
    showEvents?: boolean;
    config?: Partial<ChartConfig>;
    onEventClick?: (event: EventMarker) => void;
}

export const SimulationVisualization: React.FC<
    SimulationVisualizationProps
> = ({ simulationId, showEvents = true, config, onEventClick }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const vizData = await getSimulationVisualizationData(simulationId);
                if (mounted) {
                    setData(vizData);
                }
            } catch (err: any) {
                if (mounted) {
                    setError(err.message || 'Failed to load simulation data');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, [simulationId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-400">Loading simulation data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-red-400">Error: {error}</div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                    {data.summary.name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <div className="text-gray-400">Current Tick</div>
                        <div className="text-white font-medium">{data.summary.tick}</div>
                    </div>
                    <div>
                        <div className="text-gray-400">Entities</div>
                        <div className="text-white font-medium">
                            {data.summary.entityCount}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400">Active Arcs</div>
                        <div className="text-white font-medium">
                            {data.summary.arcCount}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400">Recent Events</div>
                        <div className="text-white font-medium">
                            {data.summary.recentEventCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="text-md font-semibold text-white mb-4">
                    Narrative Momentum
                </h4>
                <div className="relative">
                    <NarrativeArcChart
                        arcs={data.arcs.arcs}
                        currentTick={data.arcs.currentTick}
                        config={config}
                    />
                    {showEvents && data.events.events.length > 0 && (
                        <EventAnnotations
                            events={data.events.events}
                            chartWidth={800}
                            chartHeight={400}
                            xScale={(tick) => (tick / data.arcs.currentTick) * 800}
                            onEventClick={onEventClick}
                        />
                    )}
                </div>
            </div>

            {/* Narrative Summary */}
            {data.summary.narrative && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-white mb-3">
                        Narrative Summary
                    </h4>
                    <p className="text-gray-300 text-sm mb-4">
                        {data.summary.narrative.summary}
                    </p>

                    {data.summary.narrative.highlights &&
                        data.summary.narrative.highlights.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-sm font-semibold text-gray-400">
                                    Highlights
                                </h5>
                                {data.summary.narrative.highlights.map(
                                    (highlight: any, index: number) => (
                                        <div
                                            key={index}
                                            className="bg-gray-900 rounded p-2 text-xs"
                                        >
                                            <span className="text-blue-400 font-medium">
                                                {highlight.theme}:
                                            </span>{' '}
                                            <span className="text-gray-300">{highlight.text}</span>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                </div>
            )}
        </div>
    );
};
