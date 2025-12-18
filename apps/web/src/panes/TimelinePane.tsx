import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useWorkspaceStore } from '../store/workspaceStore';

export const TimelinePane = () => {
  const { entities, selectedEntityIds, selectEntity } = useWorkspaceStore();

  // Transform entities into timeline events
  // Y-axis could be categorical (Entity Type) or just random/jittered for visibility
  const data = useMemo(() => {
    return entities
      .filter(e => e.timestamp)
      .map((e, index) => ({
        ...e,
        time: new Date(e.timestamp!).getTime(),
        yValue: index % 3, // Simple staggering to avoid overlap
      }))
      .sort((a, b) => a.time - b.time);
  }, [entities]);

  const formatTime = (time: number) => {
    return new Date(time).toLocaleDateString();
  };

  const handlePointClick = (data: any) => {
    if (data && data.payload) {
        selectEntity(data.payload.id);
    }
  };

  return (
    <div className="w-full h-full relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col p-4">
      <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-emerald-400 border border-emerald-900/50">
        TEMPORAL EVENTS
      </div>
      <div className="flex-1 mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <XAxis
            type="number"
            dataKey="time"
            name="Time"
            domain={['auto', 'auto']}
            tickFormatter={formatTime}
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="yValue"
            name="Stagger"
            hide
          />
          <ZAxis type="number" range={[60, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
            labelFormatter={(value) => new Date(value).toLocaleString()}
          />
          <Scatter name="Events" data={data} onClick={handlePointClick} cursor="pointer">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={selectedEntityIds.includes(entry.id) ? '#22d3ee' : '#10b981'}
              />
            ))}
          </Scatter>

          {/* Add current time line or other reference lines if needed */}
        </ScatterChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};
