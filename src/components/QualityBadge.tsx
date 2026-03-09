import React from 'react';
export default function QualityBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'danger';
  return <span className={`badge badge--${color}`}>Quality {pct}%</span>;
}
