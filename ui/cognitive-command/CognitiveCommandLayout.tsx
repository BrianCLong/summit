import React, { lazy, Suspense } from 'react';
import { CognitiveWorkspace } from './CognitiveWorkspace';
import { useCommandContext } from './CommandContextProvider';
import type { CommandMode } from './types';

const StrategicForesightDashboard = lazy(() => import('./foresight/StrategicForesightDashboard'));
const WorldStateMap = lazy(() => import('./world-model/WorldStateMap'));
const NarrativeBattlespaceMap = lazy(() => import('./narrative-battlespace/NarrativeBattlespaceMap'));
const DecisionWorkbench = lazy(() => import('./decision-sim/DecisionWorkbench'));
const AutonomySupervisor = lazy(() => import('./autonomy/AutonomySupervisor'));
const MissionCommandCenter = lazy(() => import('./missions/MissionCommandCenter'));
const StrategicGovernancePanel = lazy(() => import('./governance/StrategicGovernancePanel'));
const CognitiveInsightFeed = lazy(() => import('./insight-feed/CognitiveInsightFeed'));

const MODE_PANELS: Record<CommandMode, React.ComponentType[]> = {
  observe: [StrategicForesightDashboard, WorldStateMap, CognitiveInsightFeed],
  investigate: [NarrativeBattlespaceMap, CognitiveInsightFeed, AutonomySupervisor],
  forecast: [StrategicForesightDashboard, WorldStateMap],
  simulate: [DecisionWorkbench, WorldStateMap],
  intervene: [DecisionWorkbench, NarrativeBattlespaceMap, MissionCommandCenter],
  govern: [StrategicGovernancePanel, MissionCommandCenter],
};

function PanelFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
    </div>
  );
}

export function CognitiveCommandLayout() {
  const { state } = useCommandContext();
  const panels = MODE_PANELS[state.context.activeMode] || MODE_PANELS.observe;

  return (
    <CognitiveWorkspace>
      <div className="grid h-full gap-px bg-zinc-800" style={{ gridTemplateColumns: `repeat(${Math.min(panels.length, 3)}, 1fr)` }}>
        {panels.map((Panel, i) => (
          <div key={i} className="overflow-auto bg-zinc-950 p-4">
            <Suspense fallback={<PanelFallback />}>
              <Panel />
            </Suspense>
          </div>
        ))}
      </div>
    </CognitiveWorkspace>
  );
}
