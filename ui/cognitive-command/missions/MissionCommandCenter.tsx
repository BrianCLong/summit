import React, { useState } from 'react';
import { CognitivePanelHost } from '../CognitivePanelHost';
import { MissionPortfolioBoard } from './MissionPortfolioBoard';
import { MissionHealthPanel } from './MissionHealthPanel';
import { MissionDependencyMap } from './MissionDependencyMap';
import { MissionIntelSummary } from './MissionIntelSummary';
import { MissionEscalationBoard } from './MissionEscalationBoard';

function MissionCommandCenter() {
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400">Mission Command</h2>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <CognitivePanelHost title="Mission Portfolio" className="col-span-2">
          <MissionPortfolioBoard onSelect={setSelectedMissionId} />
        </CognitivePanelHost>
        <CognitivePanelHost title="Mission Health">
          <MissionHealthPanel missionId={selectedMissionId} />
        </CognitivePanelHost>
        <CognitivePanelHost title="Dependencies">
          <MissionDependencyMap missionId={selectedMissionId} />
        </CognitivePanelHost>
        <CognitivePanelHost title="Intel Summary">
          <MissionIntelSummary missionId={selectedMissionId} />
        </CognitivePanelHost>
        <CognitivePanelHost title="Escalations">
          <MissionEscalationBoard />
        </CognitivePanelHost>
      </div>
    </div>
  );
}

export default MissionCommandCenter;
