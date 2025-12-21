import React from 'react';

const PilotDashboard = ({ tenantId = 'Unknown' }) => {
  // Mock data for now
  const metrics = {
    dau: 12,
    errors: 0.5, // %
    timeToValue: '450ms',
    openIssues: 3
  };

  return (
    <div style={{ padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', marginBottom: '12px' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px', color: '#1565c0' }}>Pilot Dashboard</h2>
      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>Tenant: {tenantId}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <MetricCard label="DAU" value={metrics.dau} />
        <MetricCard label="Errors" value={`${metrics.errors}%`} status={metrics.errors > 1 ? 'risk' : 'good'} />
        <MetricCard label="Time" value={metrics.timeToValue} />
        <MetricCard label="Issues" value={metrics.openIssues} status={metrics.openIssues > 0 ? 'warning' : 'good'} />
      </div>

      <div style={{ marginTop: '15px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Active Beta Features</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ padding: '6px', background: '#f5f5f5', borderRadius: '4px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span>Advanced Graph</span>
            <span style={{ color: 'green', fontWeight: '500' }}>Active</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, status = 'neutral' }) => {
  const getColor = (s) => {
    switch (s) {
      case 'risk': return '#d32f2f';
      case 'warning': return '#ed6c02';
      case 'good': return '#2e7d32';
      default: return '#333';
    }
  };

  return (
    <div style={{ padding: '8px', background: '#f9f9f9', borderRadius: '4px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: getColor(status) }}>{value}</div>
    </div>
  );
};

export default PilotDashboard;
