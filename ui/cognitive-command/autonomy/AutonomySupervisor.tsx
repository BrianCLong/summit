import React, { useState } from 'react';
import { CognitivePanelHost } from '../CognitivePanelHost';
import { AgentFleetBoard } from './AgentFleetBoard';
import { InvestigationQueue } from './InvestigationQueue';
import { AutonomousLeadReview } from './AutonomousLeadReview';
import { TaskEscalationPanel } from './TaskEscalationPanel';
import { HumanApprovalGate } from './HumanApprovalGate';

function AutonomySupervisor() {
  const [view, setView] = useState<'fleet' | 'queue' | 'escalations'>('fleet');

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">Autonomous Oversight</h2>
        <div className="flex items-center gap-1">
          {(['fleet', 'queue', 'escalations'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                view === v ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <CognitivePanelHost title="Agent Fleet" className="col-span-2">
          <AgentFleetBoard />
        </CognitivePanelHost>
        <CognitivePanelHost title="Investigation Queue">
          <InvestigationQueue />
        </CognitivePanelHost>
        <CognitivePanelHost title="Lead Review">
          <AutonomousLeadReview />
        </CognitivePanelHost>
        <CognitivePanelHost title="Escalations">
          <TaskEscalationPanel />
        </CognitivePanelHost>
        <CognitivePanelHost title="Approval Gates">
          <HumanApprovalGate />
        </CognitivePanelHost>
      </div>
    </div>
  );
}

export default AutonomySupervisor;
