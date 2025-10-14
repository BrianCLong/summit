import React from 'react';

export interface LabelCoverageRow {
  label: string;
  total: number;
  captured: number;
  coverage: number;
}

export interface SliceCoverageProps {
  sliceName: string;
  version: string;
  coverage: number;
  trafficTotal: number;
  capturedWeight: number;
  labelCoverage: LabelCoverageRow[];
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function SliceCoveragePanel({
  sliceName,
  version,
  coverage,
  trafficTotal,
  capturedWeight,
  labelCoverage,
}: SliceCoverageProps) {
  return (
    <section className="slice-coverage-panel">
      <header className="slice-coverage-panel__header">
        <h2 className="slice-coverage-panel__title">{sliceName} · {version}</h2>
        <p className="slice-coverage-panel__subtitle">
          Captured {capturedWeight} of {trafficTotal} weighted production events ({formatPercent(coverage)} coverage)
        </p>
      </header>
      <table className="slice-coverage-panel__table">
        <thead>
          <tr>
            <th align="left">Label</th>
            <th align="right">Traffic Weight</th>
            <th align="right">Captured</th>
            <th align="right">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {labelCoverage.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td align="right">{row.total.toFixed(2)}</td>
              <td align="right">{row.captured.toFixed(2)}</td>
              <td align="right">{formatPercent(row.coverage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default SliceCoveragePanel;
