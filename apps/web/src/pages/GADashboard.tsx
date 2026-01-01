import React from 'react';

export const GADashboard = () => {
  // Mock data for GA metrics
  const metrics = {
    queryLatency: '320ms', // Target < 500ms
    ingestTime: '12s', // Target < 30s
    provenanceCompleteness: '100%',
    auditIntegrity: 'Pass'
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">GA Readiness Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded shadow">
          <h2 className="text-lg font-semibold text-gray-700">P95 Query Latency</h2>
          <p className="text-3xl font-bold text-green-600">{metrics.queryLatency}</p>
          <p className="text-sm text-gray-500">Target: &lt; 500ms</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="text-lg font-semibold text-gray-700">Ingest E2E Time</h2>
          <p className="text-3xl font-bold text-green-600">{metrics.ingestTime}</p>
          <p className="text-sm text-gray-500">Target: &lt; 30s</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="text-lg font-semibold text-gray-700">Provenance Completeness</h2>
          <p className="text-3xl font-bold text-green-600">{metrics.provenanceCompleteness}</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="text-lg font-semibold text-gray-700">Audit Integrity</h2>
          <p className="text-3xl font-bold text-green-600">{metrics.auditIntegrity}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Golden Run Status</h2>
        <div className="bg-green-100 p-4 rounded text-green-800">
          ✅ <strong>Last Run Passed</strong> (via CI ga-gate)
        </div>
      </div>
    </div>
  );
};

export default GADashboard;
