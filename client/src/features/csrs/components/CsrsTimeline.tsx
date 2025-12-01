import React from 'react';

import { buildDependencyRows, buildTimelineRows } from '../dataTransforms';
import type { RetentionPlan } from '../types';

export interface CsrsTimelineProps {
  plan: RetentionPlan;
}

const srOnlyStyle: React.CSSProperties = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  width: '1px',
};

export const CsrsTimeline: React.FC<CsrsTimelineProps> = ({ plan }) => {
  const timelineRows = buildTimelineRows(plan);
  const dependencyRows = buildDependencyRows(plan);

  return (
    <div aria-label="Consent-Scoped Retention Simulator">
      <header>
        <h2>Consent-Scoped Retention Simulator</h2>
        <p>
          Generated at <strong>{plan.generated_at}</strong> with late write slip{' '}
          <strong>{plan.clock_shift.late_write_slip_days}d</strong> and backfill window{' '}
          <strong>{plan.clock_shift.backfill_days}d</strong>.
        </p>
      </header>

      <section aria-label="Retention timelines">
        <h3>Per-purpose deletion horizons</h3>
        <table>
          <caption className="sr-only" style={srOnlyStyle}>
            Per-purpose deletion horizons
          </caption>
          <thead>
            <tr>
              <th scope="col">Dataset</th>
              <th scope="col">Purpose</th>
              <th scope="col">Baseline</th>
              <th scope="col">Late writes</th>
              <th scope="col">Backfill</th>
              <th scope="col">Risk</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {timelineRows.map((row) => (
              <tr key={`${row.dataset}-${row.purpose}`} data-risk={row.riskLevel}>
                <td>{row.dataset}</td>
                <td>{row.purpose}</td>
                <td>{row.baselineHorizon}</td>
                <td>{row.lateWriteHorizon}</td>
                <td>{row.backfillHorizon}</td>
                <td>{formatRiskLabel(row.riskLevel)}</td>
                <td>{row.blockers.join(', ') || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Dependent artifacts">
        <h3>Downstream artifact impacts</h3>
        <table>
          <caption className="sr-only" style={srOnlyStyle}>
            Downstream artifact impacts
          </caption>
          <thead>
            <tr>
              <th scope="col">Dataset</th>
              <th scope="col">Artifact</th>
              <th scope="col">Purpose</th>
              <th scope="col">Type</th>
              <th scope="col">Impact</th>
              <th scope="col">Alignment Δ (days)</th>
            </tr>
          </thead>
          <tbody>
            {dependencyRows.map((row) => (
              <tr key={`${row.dataset}-${row.name}`}>
                <td>{row.dataset}</td>
                <td>{row.name}</td>
                <td>{row.purpose}</td>
                <td>{row.type}</td>
                <td>{row.impact}</td>
                <td>{row.alignmentDeltaDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

function formatRiskLabel(level: 'ok' | 'elevated' | 'breach'): string {
  switch (level) {
    case 'breach':
      return 'Breach';
    case 'elevated':
      return 'Elevated';
    default:
      return 'OK';
  }
}

export default CsrsTimeline;
