// conductor-ui/frontend/src/components/policy/OpaDecisionBadge.tsx
import React from 'react';

interface OpaDecisionBadgeProps {
  decision: { allow: boolean; reason?: string };
}

export const OpaDecisionBadge = ({ decision }: OpaDecisionBadgeProps) => {
  const style = {
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    backgroundColor: decision.allow ? 'green' : 'red',
  };

  return (
    <span
      style={style}
      title={decision.reason || (decision.allow ? 'Allowed' : 'Denied')}
    >
      {decision.allow ? 'Allowed' : 'Denied'}
    </span>
  );
};
