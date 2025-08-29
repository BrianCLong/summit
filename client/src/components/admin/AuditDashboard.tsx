import React, { useEffect, useState } from 'react';

interface ResolutionRecord {
  id: string;
  source: string;
  canonicalId: string;
}

const AuditDashboard: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<ResolutionRecord[]>([]);

  useEffect(() => {
    // Placeholder: fetch logs and resolution data from API
    setLogs(['ingest started']);
    setResolutions([{ id: '1', source: 'Alice', canonicalId: 'canonical_1' }]);
  }, []);

  return (
    <div data-testid="audit-dashboard">
      <h2>Audit Dashboard</h2>
      <section>
        <h3>Recent Ingest Logs</h3>
        <ul>
          {logs.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Entity Resolutions</h3>
        <ul>
          {resolutions.map((r) => (
            <li key={r.id}>
              {r.source} → {r.canonicalId}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AuditDashboard;
