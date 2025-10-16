// conductor-ui/frontend/src/views/admin/MultiRegionStatusView.tsx
import React, { useState, useEffect } from 'react';

type RegionStatus = {
  name: string;
  health: 'green' | 'yellow' | 'red';
  replicaLag: number;
};

const fetchRegionStatus = async (): Promise<RegionStatus[]> => {
  await new Promise((res) => setTimeout(res, 300));
  return [
    { name: 'us-east-1', health: 'green', replicaLag: 120 },
    { name: 'us-west-2', health: 'green', replicaLag: 150 },
    { name: 'eu-central-1', health: 'yellow', replicaLag: 1200 },
  ];
};

export const MultiRegionStatusView = () => {
  const [regions, setRegions] = useState<RegionStatus[]>([]);

  useEffect(() => {
    fetchRegionStatus().then(setRegions);
  }, []);

  const handleSimulateFailover = () => {
    if (
      confirm(
        'This is a staging-only action. Proceed with failover simulation?',
      )
    ) {
      console.log('Initiating staging failover...');
      alert('Failover simulation started.');
    }
  };

  return (
    <div>
      <h1>Multi-Region Status</h1>
      <table>
        <thead>
          <tr>
            <th>Region</th>
            <th>Health</th>
            <th>Replica Lag (ms)</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>
                <span style={{ color: r.health }}>●</span>
              </td>
              <td>{r.replicaLag}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleSimulateFailover}>
        Simulate Staging Failover
      </button>
    </div>
  );
};
