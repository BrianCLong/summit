import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const SERVER_STATUS_QUERY = gql`
  query ServerStatus {
    __typename
  }
`;

function ServerStatus() {
  const [healthStatus, setHealthStatus] = useState<
    'unknown' | 'healthy' | 'error'
  >('unknown');
  const { data, loading, error } = useQuery(SERVER_STATUS_QUERY, {
    errorPolicy: 'all',
    fetchPolicy: 'no-cache',
  });

  useEffect(() => {
    // Test health endpoint
    fetch('http://localhost:4000/healthz')
      .then((response) =>
        response.ok ? setHealthStatus('healthy') : setHealthStatus('error'),
      )
      .catch(() => setHealthStatus('error'));
  }, []);

  const graphqlStatus = data
    ? 'healthy'
    : error
      ? 'error'
      : loading
        ? 'checking'
        : 'unknown';

  return (
    <div
      className="panel"
      style={{
        padding: '12px 16px',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor:
              healthStatus === 'healthy'
                ? '#22c55e'
                : healthStatus === 'error'
                  ? '#ef4444'
                  : '#d1d5db',
            display: 'inline-block',
          }}
        ></span>
        <span>Health: {healthStatus}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor:
              graphqlStatus === 'healthy'
                ? '#22c55e'
                : graphqlStatus === 'error'
                  ? '#ef4444'
                  : '#d1d5db',
            display: 'inline-block',
          }}
        ></span>
        <span>GraphQL: {graphqlStatus}</span>
      </div>

      {healthStatus === 'healthy' && graphqlStatus === 'healthy' && (
        <span style={{ color: '#22c55e', fontSize: '12px' }}>
          🟢 All systems operational
        </span>
      )}
    </div>
  );
}

export default ServerStatus;
