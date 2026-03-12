import React from 'react';
import { CognitivePanelHost } from '../CognitivePanelHost';
import { NarrativeClusterView } from './NarrativeClusterView';
import { InfluenceFlowGraph } from './InfluenceFlowGraph';
import { MessagePropagationTimeline } from './MessagePropagationTimeline';
import { CounterNarrativeWorkbench } from './CounterNarrativeWorkbench';
import { NarrativeTerrainPanel } from './NarrativeTerrainPanel';

function NarrativeBattlespaceMap() {
  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400">Narrative Battlespace</h2>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <CognitivePanelHost title="Narrative Clusters" className="col-span-2">
          <NarrativeClusterView />
        </CognitivePanelHost>
        <CognitivePanelHost title="Influence Flows">
          <InfluenceFlowGraph />
        </CognitivePanelHost>
        <CognitivePanelHost title="Propagation Timeline">
          <MessagePropagationTimeline />
        </CognitivePanelHost>
        <CognitivePanelHost title="Counter-Narrative Workbench">
          <CounterNarrativeWorkbench />
        </CognitivePanelHost>
        <CognitivePanelHost title="Narrative Terrain">
          <NarrativeTerrainPanel />
        </CognitivePanelHost>
      </div>
    </div>
  );
}

export default NarrativeBattlespaceMap;
