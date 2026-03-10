import React from 'react';
import { CognitivePanelHost } from '../CognitivePanelHost';
import { PolicyForecastGate } from './PolicyForecastGate';
import { InterventionApprovalBoard } from './InterventionApprovalBoard';
import { GovernanceRiskRadar } from './GovernanceRiskRadar';
import { DecisionCompliancePanel } from './DecisionCompliancePanel';
import { OutcomeReviewPanel } from './OutcomeReviewPanel';

function StrategicGovernancePanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400">Strategic Governance</h2>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <CognitivePanelHost title="Policy Forecast Gates" className="col-span-2">
          <PolicyForecastGate />
        </CognitivePanelHost>
        <CognitivePanelHost title="Intervention Approvals">
          <InterventionApprovalBoard />
        </CognitivePanelHost>
        <CognitivePanelHost title="Risk Radar">
          <GovernanceRiskRadar />
        </CognitivePanelHost>
        <CognitivePanelHost title="Decision Compliance">
          <DecisionCompliancePanel />
        </CognitivePanelHost>
        <CognitivePanelHost title="Outcome Review">
          <OutcomeReviewPanel />
        </CognitivePanelHost>
      </div>
    </div>
  );
}

export default StrategicGovernancePanel;
