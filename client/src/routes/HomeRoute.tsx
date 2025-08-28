import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ServerStatus from '../components/ServerStatus';
import AdvancedSearch from '../components/AdvancedSearch';
import GraphPreview from '../components/GraphPreview';
import DataExport from '../components/DataExport';
import InvestigationManager from '../components/InvestigationManager';

function HomeRoute() {
  const navigate = useNavigate();
  const [actionId, setActionId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'investigations' | 'search' | 'export'>('overview');
  const [selectedInvestigation, setSelectedInvestigation] = useState<any>(null);
  const graphStats = useSelector((state: any) => state.graph?.graphStats);
  
  const handleNavigateToAction = () => {
    if (actionId.trim()) {
      navigate(`/actions/${actionId.trim()}`);
    }
  };

  const quickActions = [
    {
      title: 'Test Action Safety',
      description: 'Try action ID: test-action-123',
      action: () => navigate('/actions/test-action-123')
    },
    {
      title: 'Sample Investigation',
      description: 'View sample action with safety controls',
      action: () => navigate('/actions/sample-investigation')
    }
  ];

  const handleSearchResultSelect = (result: any) => {
    console.log('Selected search result:', result);
    // Navigate to entity details or investigation
    if (result.investigationId) {
      navigate(`/investigations/${result.investigationId}`);
    }
  };

  const tabs = [
    { key: 'overview', label: '🏠 Overview', icon: '🏠' },
    { key: 'investigations', label: '🔍 Investigations', icon: '🔍' },
    { key: 'search', label: '🔎 Advanced Search', icon: '🔎' },
    { key: 'export', label: '📤 Data Export', icon: '📤' }
  ] as const;

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '600', marginBottom: '8px' }}>
          IntelGraph Platform
        </h1>
        <p className="muted" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
          Intelligence Analysis & Graph Visualization System
        </p>
        
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid var(--hairline)',
          marginBottom: '24px'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #1a73e8' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? '600' : '400',
                color: activeTab === tab.key ? '#1a73e8' : '#666',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ marginBottom: '32px' }}>
        <div className="panel" style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px', color: '#1a73e8' }}>
            🚀 Platform Status
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <ServerStatus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <strong>Graph Nodes:</strong> {graphStats?.numNodes || 0}
            </div>
            <div>
              <strong>Graph Edges:</strong> {graphStats?.numEdges || 0}  
            </div>
            <div>
              <strong>Graph Density:</strong> {graphStats?.density || '0.00'}
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px' }}>
            🔍 Navigate to Action
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={actionId}
              onChange={(e) => setActionId(e.target.value)}
              placeholder="Enter action ID..."
              style={{
                padding: '8px 12px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                flex: 1,
                fontSize: '14px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleNavigateToAction()}
            />
            <button
              onClick={handleNavigateToAction}
              disabled={!actionId.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: actionId.trim() ? '#1a73e8' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionId.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              Go
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px' }}>
            ⚡ Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {quickActions.map((item, index) => (
              <div key={index} className="panel" style={{ padding: '16px', cursor: 'pointer' }} onClick={item.action}>
                <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>{item.title}</h4>
                <p className="muted note" style={{ marginBottom: '12px' }}>{item.description}</p>
                <div style={{ color: '#1a73e8', fontSize: '14px', fontWeight: '500' }}>
                  → Try it now
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>📊 Graph Analysis</h3>
            <p className="muted note">Explore relationships and patterns in intelligence data</p>
            <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
              Neo4j • Cytoscape • D3.js
            </div>
          </div>
          
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>📈 Analytics Dashboard</h3>
            <p className="muted note">Monitor system metrics and investigation insights</p>
            <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
              Real-time • Grafana • Prometheus
            </div>
          </div>
          
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>🛡️ Action Safety</h3>
            <p className="muted note">AI-powered security guardrails and safety controls</p>
            <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
              ABAC • RBAC • Audit Trail
            </div>
          </div>
          
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>🔗 GraphQL API</h3>
            <p className="muted note">Unified API for data access and real-time subscriptions</p>
            <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
              Apollo • Subscriptions • TypeScript
            </div>
          </div>
        </div>

        {/* Overview Tab Additional Content */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <GraphPreview
            title="📊 Graph Overview"
            height={300}
            maxNodes={15}
            onNodeClick={(node) => console.log('Clicked node:', node)}
          />
        </div>
      </div>
      )}

      {activeTab === 'investigations' && (
        <InvestigationManager
          onInvestigationSelect={setSelectedInvestigation}
          currentInvestigationId={selectedInvestigation?.id}
        />
      )}

      {activeTab === 'search' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '16px' }}>
              🔎 Advanced Search & Analysis
            </h2>
            <AdvancedSearch
              onResultSelect={handleSearchResultSelect}
              placeholder="Search entities, investigations, actions, or upload data..."
              showFilters={true}
            />
          </div>
          
          <div className="panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px' }}>
              🎯 Search Tips
            </h3>
            <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
              <div><strong>Entity Search:</strong> <code>type:person john</code> or <code>confidence:&gt;80</code></div>
              <div><strong>Investigation:</strong> <code>investigation:APT-2024-001</code></div>
              <div><strong>Date Range:</strong> <code>created:2024-01-01..2024-12-31</code></div>
              <div><strong>Boolean:</strong> <code>malware AND (APT OR campaign)</code></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <DataExport
            investigationId={selectedInvestigation?.id}
            selectedEntities={[]}
            onExportComplete={(result) => {
              console.log('Export completed:', result);
              // Could show notification here
            }}
            showReports={true}
          />
        </div>
      )}
    </div>
  );
}

export default HomeRoute;