import React from 'react';

export const MemoryTimeline: React.FC<{ timeline: any[] }> = ({ timeline }) => {
  return (
    <div className="bg-slate-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-2">Timeline</h3>
      <ul className="space-y-2">
        {timeline.length === 0 && <p className="text-slate-400 italic">No events recorded.</p>}
        {timeline.map((event, idx) => (
          <li key={idx} className="border-l-2 border-blue-500 pl-2">
            <span className="text-sm text-slate-300">{event.timestamp}</span>
            <p>{event.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
