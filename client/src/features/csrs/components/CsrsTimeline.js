"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsrsTimeline = void 0;
const react_1 = __importDefault(require("react"));
const dataTransforms_1 = require("../dataTransforms");
const srOnlyStyle = {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    width: '1px',
};
const CsrsTimeline = ({ plan }) => {
    const timelineRows = (0, dataTransforms_1.buildTimelineRows)(plan);
    const dependencyRows = (0, dataTransforms_1.buildDependencyRows)(plan);
    return (<div aria-label="Consent-Scoped Retention Simulator">
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
            {timelineRows.map((row) => (<tr key={`${row.dataset}-${row.purpose}`} data-risk={row.riskLevel}>
                <td>{row.dataset}</td>
                <td>{row.purpose}</td>
                <td>{row.baselineHorizon}</td>
                <td>{row.lateWriteHorizon}</td>
                <td>{row.backfillHorizon}</td>
                <td>{formatRiskLabel(row.riskLevel)}</td>
                <td>{row.blockers.join(', ') || 'None'}</td>
              </tr>))}
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
            {dependencyRows.map((row) => (<tr key={`${row.dataset}-${row.name}`}>
                <td>{row.dataset}</td>
                <td>{row.name}</td>
                <td>{row.purpose}</td>
                <td>{row.type}</td>
                <td>{row.impact}</td>
                <td>{row.alignmentDeltaDays}</td>
              </tr>))}
          </tbody>
        </table>
      </section>
    </div>);
};
exports.CsrsTimeline = CsrsTimeline;
function formatRiskLabel(level) {
    switch (level) {
        case 'breach':
            return 'Breach';
        case 'elevated':
            return 'Elevated';
        default:
            return 'OK';
    }
}
exports.default = exports.CsrsTimeline;
