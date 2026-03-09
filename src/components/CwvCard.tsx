import React from 'react';
export default function CwvCard() {
  const data = require('@site/docs/ops/telemetry/cwv.json');
  if (!data?.p50) return null;
  return (
    <div className="card padding--md">
      <strong>CWV</strong> LCP p50: {Math.round(data.p50.LCP)}ms • INP p50:{' '}
      {Math.round(data.p50.INP)}ms • CLS p50: {(data.p50.CLS || 0).toFixed(3)}
    </div>
  );
}
