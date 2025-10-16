import React from 'react';
export default function TtaCard() {
  const data = require('@site/docs/ops/tta/summary.json');
  if (!data?.length) return null;
  const last = data[data.length - 1];
  return (
    <div className="card padding--md">
      <strong>Median Time‑to‑Answer:</strong>{' '}
      {last.tta_p50 ? `${Math.round(last.tta_p50 / 1000)}s` : '–'} •{' '}
      <em>P90:</em> {last.tta_p90 ? `${Math.round(last.tta_p90 / 1000)}s` : '–'}
    </div>
  );
}
