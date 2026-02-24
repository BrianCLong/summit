import React, { useState, useEffect } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

interface ArcDataPoint {
    tick: number;
    [theme: string]: number;
}

interface NarrativeEvent {
    id: string;
    type: string;
    theme: string;
    intensity: number;
    description: string;
    actorId?: string;
    tick: number;
}

interface MomentumChartProps {
    simulationId: string;
    refreshInterval?: number; // ms to auto-refresh, 0 to disable
}

// Generate consistent colors for themes
const THEME_COLORS = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#16a34a', // green-600
    '#d97706', // amber-600
    '#9333ea', // purple-600
    '#475569', // slate-600
];

export const MomentumChart: React.FC<MomentumChartProps> = ({
    simulationId,
    refreshInterval = 5000
}) => {
    const [data, setData] = useState<ArcDataPoint[]>([]);
    const [events, setEvents] = useState<NarrativeEvent[]>([]);
    const [themes, setThemes] = useState<string[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<NarrativeEvent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!simulationId) return;

        const fetchArcs = async () => {
            try {
                const response = await fetch(`/api/narrative-sim/simulations/${simulationId}/arcs`);
                if (response.ok) {
                    const json = await response.json();
                    setData(json.data);
                    setEvents(json.events);

                    if (json.data.length > 0) {
                        const keys = Object.keys(json.data[0]).filter(k => k !== 'tick');
                        setThemes(keys);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch arc data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchArcs();

        let intervalId: NodeJS.Timeout;
        if (refreshInterval > 0) {
            intervalId = setInterval(fetchArcs, refreshInterval);
        }

        return () => clearInterval(intervalId);
    }, [simulationId, refreshInterval]);

    if (loading && data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
                Loading Narrative Arcs...
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
                No narrative arc data available.
            </div>
        );
    }

    // Custom tooltip to show data and events
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const tickEvents = events.filter(e => e.tick === label);

            return (
                <div className="bg-white p-3 border border-slate-200 shadow-md rounded-md text-sm">
                    <p className="font-semibold text-slate-800 mb-2">Tick {label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-slate-600 capitalize">{entry.name}:</span>
                            <span className="font-medium">{(entry.value * 100).toFixed(1)}%</span>
                        </div>
                    ))}

                    {tickEvents.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Interventions:</p>
                            {tickEvents.map(e => (
                                <p key={e.id} className="text-xs text-slate-700 truncate max-w-xs cursor-pointer hover:text-blue-600" onClick={() => setSelectedEvent(e)}>
                                    • {e.description}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Narrative Theme Momentum</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="tick"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickMargin={10}
                            />
                            <YAxis
                                domain={[0, 1]}
                                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                            {themes.map((theme, index) => (
                                <Line
                                    key={theme}
                                    type="monotone"
                                    dataKey={theme}
                                    name={theme}
                                    stroke={THEME_COLORS[index % THEME_COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ r: 2, fill: THEME_COLORS[index % THEME_COLORS.length] }}
                                    activeDot={{ r: 6 }}
                                />
                            ))}

                            {events.map((event, index) => (
                                <ReferenceLine
                                    key={event.id || index}
                                    x={event.tick}
                                    stroke="#ef4444"
                                    strokeDasharray="3 3"
                                    label={{
                                        position: 'top',
                                        value: '⚡',
                                        fill: '#ef4444',
                                        fontSize: 14
                                    }}
                                    className="cursor-pointer hover:stroke-2"
                                    onClick={() => setSelectedEvent(event)}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {selectedEvent && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
                    <div className="text-xl">⚡</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-blue-900 text-sm">Event Details (Tick {selectedEvent.tick})</h4>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="text-blue-400 hover:text-blue-600 text-xs font-medium"
                            >
                                Close
                            </button>
                        </div>
                        <p className="text-sm text-blue-800 mt-1">{selectedEvent.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-blue-700">
                            <span><strong>Type:</strong> <span className="capitalize">{selectedEvent.type}</span></span>
                            <span><strong>Theme:</strong> <span className="capitalize">{selectedEvent.theme}</span></span>
                            <span><strong>Intensity:</strong> {selectedEvent.intensity.toFixed(2)}</span>
                            {selectedEvent.actorId && <span><strong>Actor ID:</strong> {selectedEvent.actorId}</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
