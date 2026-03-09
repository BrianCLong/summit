import React from 'react';
import { MemoryTimeline } from './MemoryTimeline';
import { MemoryGraph } from './MemoryGraph';
import { MemorySearch } from './MemorySearch';
import { MemoryNotes } from './MemoryNotes';

export interface InvestigationMemoryData {
  investigationId: string;
  entities: any[];
  events: any[];
  hypotheses: any[];
  evidence: any[];
  analystNotes: any[];
  agentFindings: any[];
  timeline: any[];
}

export const InvestigationMemory: React.FC<{ data?: InvestigationMemoryData }> = ({ data }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-4">
      <h2 className="text-xl font-bold mb-4">Investigation Memory</h2>
      <div className="grid grid-cols-2 gap-4 flex-grow">
        <div className="col-span-1 flex flex-col gap-4">
          <MemorySearch />
          <MemoryTimeline timeline={data?.timeline || []} />
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <MemoryGraph entities={data?.entities || []} />
          <MemoryNotes notes={data?.analystNotes || []} />
        </div>
      </div>
    </div>
  );
};
