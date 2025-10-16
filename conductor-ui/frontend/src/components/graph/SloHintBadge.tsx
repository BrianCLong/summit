// conductor-ui/frontend/src/components/graph/SloHintBadge.tsx
import React from 'react';

interface SloHintBadgeProps {
  latencyMs: number;
  sloMs: number;
}

export const SloHintBadge = ({ latencyMs, sloMs }: SloHintBadgeProps) => {
  const isSlow = latencyMs > sloMs;
  const color = isSlow ? 'red' : 'green';
  return (
    <span style={{ color }}>
      {latencyMs}ms (SLO: {sloMs}ms)
    </span>
  );
};
