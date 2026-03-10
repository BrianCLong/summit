import React from 'react';
import { CognitivePanelHost } from '../CognitivePanelHost';
import { ForecastOverview } from './ForecastOverview';
import { ProbabilityShiftPanel } from './ProbabilityShiftPanel';
import { SignalEmergenceBoard } from './SignalEmergenceBoard';
import { ConfidenceBreakdown } from './ConfidenceBreakdown';

function StrategicForesightDashboard() {
  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Strategic Foresight</h2>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <CognitivePanelHost title="Forecast Overview" className="col-span-2">
          <ForecastOverview />
        </CognitivePanelHost>
        <CognitivePanelHost title="Probability Shifts">
          <ProbabilityShiftPanel />
        </CognitivePanelHost>
        <CognitivePanelHost title="Signal Emergence">
          <SignalEmergenceBoard />
        </CognitivePanelHost>
        <CognitivePanelHost title="Confidence Breakdown" className="col-span-2">
          <ConfidenceBreakdown />
        </CognitivePanelHost>
      </div>
    </div>
  );
}

export default StrategicForesightDashboard;
