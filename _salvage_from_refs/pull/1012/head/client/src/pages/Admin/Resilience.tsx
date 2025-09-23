import React, { useState } from 'react';
import { RegionBadge } from '../../components/status/RegionBadge';

export const Resilience: React.FC = () => {
  const [lastFailover] = useState<string>('never');
  const simulate = () => fetch('/api/chaos/brownout?dry-run=1');
  return (
    <div>
      <h1>Resilience</h1>
      <RegionBadge region="us-west" />
      <div>RTO: 15m / RPO: 5m</div>
      <div>Last failover: {lastFailover}</div>
      <button onClick={simulate}>Simulate Brownout</button>
    </div>
  );
};
