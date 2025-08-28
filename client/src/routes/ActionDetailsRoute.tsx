import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ActionSafetyBanner from '../components/ActionSafetyBanner';
import { useActionSafetyStatus } from '../hooks/useActionSafetyStatus';

export default function ActionDetailsRoute() {
  const { actionId } = useParams<{ actionId: string }>();
  const navigate = useNavigate();

  if (!actionId) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
          ❌ No Action Selected
        </h1>
        <p className="muted" style={{ marginBottom: '16px' }}>
          The URL must include /actions/:actionId
        </p>
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Return Home
        </button>
      </div>
    );
  }

  const { status, loading, error } = useActionSafetyStatus(actionId);

  if (error) {
    // This gets caught by ErrorBoundary as well, but show a friendly inline state
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px', color: '#d73527' }}>
          ⚠️ Failed to Load Action
        </h1>
        <div className="panel" style={{ padding: '16px', marginBottom: '16px', backgroundColor: '#fef2f2' }}>
          <strong>Error Details:</strong>
          <pre style={{ 
            marginTop: '8px', 
            fontSize: '12px', 
            whiteSpace: 'pre-wrap', 
            color: '#7f1d1d',
            backgroundColor: '#fff',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #fecaca'
          }}>
            {String(error.message)}
          </pre>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
          <button 
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '8px' }}>
          🔍 Action Details
        </h1>
        <div className="panel" style={{ 
          padding: '12px 16px', 
          backgroundColor: '#f8f9fa',
          display: 'inline-block',
          fontSize: '14px'
        }}>
          <strong>Action ID:</strong> <code style={{ 
            backgroundColor: '#e5e7eb', 
            padding: '2px 6px', 
            borderRadius: '3px',
            fontFamily: 'monospace'
          }}>{actionId}</code>
        </div>
      </header>

      {loading && (
        <div className="panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>⏳ Loading action details…</div>
          <div className="muted">Checking safety status and retrieving information</div>
        </div>
      )}
      
      {status && (
        <div style={{ marginBottom: '24px' }}>
          <ActionSafetyBanner
            status={status.status}
            reason={status.reason}
            appealUrl={status.appealUrl}
          />
        </div>
      )}

      <div className="panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '16px' }}>
          📋 Action Information
        </h2>
        
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <strong>Status:</strong><br/>
              <span style={{ 
                color: status?.status === 'DENIED' ? '#dc2626' : 
                      status?.status === 'CANCELLED' ? '#d97706' : '#059669'
              }}>
                {status?.status || 'PENDING'}
              </span>
            </div>
            <div>
              <strong>Reason Code:</strong><br/>
              <code>{status?.reasonCode || 'N/A'}</code>
            </div>
            <div>
              <strong>Safety Check:</strong><br/>
              {status ? '✅ Completed' : '⏳ In Progress'}
            </div>
          </div>
        )}
        
        {status?.reason && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
            <strong>Reason:</strong> {status.reason}
          </div>
        )}
      </div>

      <div id="action-details" style={{ marginTop: '24px' }}>
        <div className="panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '12px' }}>
            🛠️ Additional Details
          </h3>
          <p className="muted">
            This is where additional action details, investigation data, and related entities would be displayed.
          </p>
        </div>
      </div>
    </div>
  );
}