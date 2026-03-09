import React from 'react';
import { MissionTimeline } from './MissionTimeline';
import { MissionEntities } from './MissionEntities';
import { MissionStatus } from './MissionStatus';

export const MissionDashboard: React.FC = () => {
  return (
    <div className="p-6 bg-slate-900 h-full text-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mission Command Dashboard</h2>
        <span className="px-3 py-1 bg-green-900/50 text-green-400 border border-green-800 rounded-full text-sm">Active</span>
      </div>
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 space-y-6">
          <MissionStatus />
          <MissionTimeline />
        </div>
        <div className="col-span-1">
          <MissionEntities />
        </div>
      </div>
    </div>
  );
};
