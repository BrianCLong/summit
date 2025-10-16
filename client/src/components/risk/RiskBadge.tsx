import React from 'react';

type Props = { score: number; band: 'low' | 'medium' | 'high' | 'critical' };

export default function RiskBadge({ score, band }: Props) {
  return (
    <span
      title={`Risk: ${band} (${score.toFixed(2)})`}
      style={{ padding: '2px 6px', borderRadius: '4px', background: '#eee' }}
    >
      {band}
    </span>
  );
}
