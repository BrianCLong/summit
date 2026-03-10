import React from 'react';
import { CognitivePanelHost } from '../CognitivePanelHost';
import { SystemDynamicsView } from './SystemDynamicsView';
import { StateTransitionExplorer } from './StateTransitionExplorer';
import { HistoricalAnalogsPanel } from './HistoricalAnalogsPanel';
import { InterventionImpactMap } from './InterventionImpactMap';
import type { WorldStateSnapshot, DimensionType } from '../types';

const DIMENSION_COLORS: Record<DimensionType, string> = {
  geopolitical: 'text-rose-400',
  technical: 'text-cyan-400',
  narrative: 'text-violet-400',
  economic: 'text-emerald-400',
  social: 'text-amber-400',
  environmental: 'text-green-400',
  military: 'text-red-400',
};

function WorldStateMap() {
  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-violet-400">World Model</h2>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <CognitivePanelHost title="System Dynamics" className="col-span-2">
          <SystemDynamicsView />
        </CognitivePanelHost>
        <CognitivePanelHost title="State Transitions">
          <StateTransitionExplorer />
        </CognitivePanelHost>
        <CognitivePanelHost title="Historical Analogs">
          <HistoricalAnalogsPanel />
        </CognitivePanelHost>
        <CognitivePanelHost title="Intervention Impact" className="col-span-2">
          <InterventionImpactMap />
        </CognitivePanelHost>
      </div>
    </div>
  );
}

export default WorldStateMap;
