import React, { useState } from 'react';
import { CognitivePanelHost } from '../CognitivePanelHost';
import { InterventionPlanner } from './InterventionPlanner';
import { OptionComparator } from './OptionComparator';
import { EffectPropagationView } from './EffectPropagationView';
import { CostRiskTradeoffPanel } from './CostRiskTradeoffPanel';
import { DecisionAuditTrail } from './DecisionAuditTrail';

function DecisionWorkbench() {
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Decision Simulation</h2>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <CognitivePanelHost title="Intervention Planner" className="col-span-2">
          <InterventionPlanner />
        </CognitivePanelHost>
        <CognitivePanelHost title="Option Comparator">
          <OptionComparator />
        </CognitivePanelHost>
        <CognitivePanelHost title="Effect Propagation">
          <EffectPropagationView />
        </CognitivePanelHost>
        <CognitivePanelHost title="Cost / Risk Tradeoff">
          <CostRiskTradeoffPanel />
        </CognitivePanelHost>
        <CognitivePanelHost title="Decision Audit Trail">
          <DecisionAuditTrail />
        </CognitivePanelHost>
      </div>
    </div>
  );
}

export default DecisionWorkbench;
