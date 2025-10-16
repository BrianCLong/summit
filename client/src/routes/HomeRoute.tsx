import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ServerStatus from '../components/ServerStatus';
import AdvancedSearch from '../components/AdvancedSearch';
import GraphPreview from '../components/GraphPreview';
import DataExport from '../components/DataExport';
import InvestigationManager from '../components/InvestigationManager';
import PerformanceMonitor from '../components/PerformanceMonitor';
import HelpSystem, { useHelpSystem } from '../components/HelpSystem';
import { useKeyboardShortcuts, ShortcutsHelp } from '../components/KeyboardShortcuts';
import { ToastProvider, useToast } from '../components/ToastContainer';
import EnhancedAIAssistant from '../components/ai-enhanced/EnhancedAIAssistant';
import RealTimePresence from '../components/collaboration/RealTimePresence';
import AdvancedAnalyticsDashboard from '../components/analytics/AdvancedAnalyticsDashboard';
import InteractiveGraphCanvas from '../components/visualization/InteractiveGraphCanvas';
import TemporalAnalysis from '../components/timeline/TemporalAnalysis';
import ThreatIntelligenceHub from '../components/intelligence/ThreatIntelligenceHub';
import ModelManagementDashboard from '../components/mlops/ModelManagementDashboard';
import CollaborativeWorkspace from '../components/collaboration/CollaborativeWorkspace';
import SecurityAuditDashboard from '../components/security/SecurityAuditDashboard';
import SystemObservabilityDashboard from '../components/monitoring/SystemObservabilityDashboard';
import DataConnectorsDashboard from '../components/integrations/DataConnectorsDashboard';
import InvestigationRecommendationsEngine from '../components/ai/InvestigationRecommendationsEngine';
import EnterpriseDashboard from '../components/reporting/EnterpriseDashboard';
import SocialNetworkAnalysis from '../components/social/SocialNetworkAnalysis';
import BehavioralAnalytics from '../components/behavioral/BehavioralAnalytics';
import ReportingCaseManagement from '../components/reporting/ReportingCaseManagement';
import ThreatHuntingDarkWeb from '../components/threat/ThreatHuntingDarkWeb';
import IntelligenceFeedsEnrichment from '../components/intelligence/IntelligenceFeedsEnrichment';

function HomeRouteInner() {
  const navigate = useNavigate();
  const [actionId, setActionId] = useState('');
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'investigations'
    | 'search'
    | 'export'
    | 'analytics'
    | 'ai-assistant'
    | 'graph-viz'
    | 'timeline'
    | 'threat-intel'
    | 'mlops'
    | 'collaboration'
    | 'security'
    | 'monitoring'
    | 'integrations'
    | 'ai-recommendations'
    | 'enterprise'
    | 'social-network'
    | 'behavioral'
    | 'case-management'
    | 'threat-hunting'
    | 'intel-feeds'
  >('overview');
  const [selectedInvestigation, setSelectedInvestigation] = useState<any>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const graphStats = useSelector((state: any) => state.graph?.graphStats);
  const { showHelp, HelpComponent } = useHelpSystem();
  const toast = useToast();

  const handleNavigateToAction = () => {
    if (actionId.trim()) {
      navigate(`/actions/${actionId.trim()}`);
    }
  };

  const quickActions = [
    {
      title: 'Test Action Safety',
      description: 'Try action ID: test-action-123',
      action: () => navigate('/actions/test-action-123'),
    },
    {
      title: 'Sample Investigation',
      description: 'View sample action with safety controls',
      action: () => navigate('/actions/sample-investigation'),
    },
  ];

  const handleSearchResultSelect = (result: any) => {
    console.log('Selected search result:', result);
    // Navigate to entity details or investigation
    if (result.investigationId) {
      navigate(`/investigations/${result.investigationId}`);
    }
  };

  // Keyboard shortcuts
  const shortcuts = [
    {
      keys: ['ctrl+1'],
      description: 'Go to Overview tab',
      action: () => setActiveTab('overview'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+2'],
      description: 'Go to Investigations tab',
      action: () => setActiveTab('investigations'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+3'],
      description: 'Go to Search tab',
      action: () => setActiveTab('search'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+4'],
      description: 'Go to Export tab',
      action: () => setActiveTab('export'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+5'],
      description: 'Go to Analytics tab',
      action: () => setActiveTab('analytics'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+6'],
      description: 'Go to AI Assistant tab',
      action: () => setActiveTab('ai-assistant'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+7'],
      description: 'Go to Graph Visualization tab',
      action: () => setActiveTab('graph-viz'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+8'],
      description: 'Go to Timeline Analysis tab',
      action: () => setActiveTab('timeline'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+9'],
      description: 'Go to Threat Intelligence tab',
      action: () => setActiveTab('threat-intel'),
      category: 'Navigation',
    },
    {
      keys: ['ctrl+0'],
      description: 'Go to MLOps tab',
      action: () => setActiveTab('mlops'),
      category: 'Navigation',
    },
    {
      keys: ['alt+1'],
      description: 'Go to Collaboration tab',
      action: () => setActiveTab('collaboration'),
      category: 'Enterprise',
    },
    {
      keys: ['alt+2'],
      description: 'Go to Security tab',
      action: () => setActiveTab('security'),
      category: 'Enterprise',
    },
    {
      keys: ['alt+3'],
      description: 'Go to Monitoring tab',
      action: () => setActiveTab('monitoring'),
      category: 'Enterprise',
    },
    {
      keys: ['alt+4'],
      description: 'Go to Integrations tab',
      action: () => setActiveTab('integrations'),
      category: 'Enterprise',
    },
    {
      keys: ['alt+5'],
      description: 'Go to AI Recommendations tab',
      action: () => setActiveTab('ai-recommendations'),
      category: 'Enterprise',
    },
    {
      keys: ['alt+6'],
      description: 'Go to Enterprise Dashboard',
      action: () => setActiveTab('enterprise'),
      category: 'Enterprise',
    },
    {
      keys: ['shift+1'],
      description: 'Go to Social Network Analysis',
      action: () => setActiveTab('social-network'),
      category: 'Intelligence',
    },
    {
      keys: ['shift+2'],
      description: 'Go to Behavioral Analytics',
      action: () => setActiveTab('behavioral'),
      category: 'Intelligence',
    },
    {
      keys: ['shift+3'],
      description: 'Go to Case Management',
      action: () => setActiveTab('case-management'),
      category: 'Intelligence',
    },
    {
      keys: ['shift+4'],
      description: 'Go to Threat Hunting',
      action: () => setActiveTab('threat-hunting'),
      category: 'Intelligence',
    },
    {
      keys: ['shift+5'],
      description: 'Go to Intelligence Feeds',
      action: () => setActiveTab('intel-feeds'),
      category: 'Intelligence',
    },
    {
      keys: ['alt+8'],
      description: 'Open OSINT Health',
      action: () => navigate('/osint/health'),
      category: 'Enterprise',
    },
    {
      keys: ['alt+0'],
      description: 'Open Cases',
      action: () => navigate('/cases'),
      category: 'Enterprise',
    },
    {
      keys: ['alt+9'],
      description: 'Open Watchlists',
      action: () => navigate('/osint/watchlists'),
      category: 'Enterprise',
    },
    {
      keys: ['alt+7'],
      description: 'Open OSINT Studio',
      action: () => navigate('/osint'),
      category: 'Enterprise',
    },
    {
      keys: ['ctrl+shift+1'],
      description: 'Open Social Network Intelligence',
      action: () => navigate('/intelligence/social-network'),
      category: 'Intelligence Routes',
    },
    {
      keys: ['ctrl+shift+2'],
      description: 'Open Behavioral Analytics',
      action: () => navigate('/intelligence/behavioral'),
      category: 'Intelligence Routes',
    },
    {
      keys: ['ctrl+shift+3'],
      description: 'Open Case Management',
      action: () => navigate('/intelligence/case-management'),
      category: 'Intelligence Routes',
    },
    {
      keys: ['ctrl+shift+4'],
      description: 'Open Threat Hunting',
      action: () => navigate('/intelligence/threat-hunting'),
      category: 'Intelligence Routes',
    },
    {
      keys: ['ctrl+shift+5'],
      description: 'Open Intelligence Feeds',
      action: () => navigate('/intelligence/feeds'),
      category: 'Intelligence Routes',
    },
    {
      keys: ['ctrl+k'],
      description: 'Quick search',
      action: () => {
        setActiveTab('search');
        setTimeout(() => {
          const searchInput = document.querySelector(
            'input[placeholder*="Search"]',
          ) as HTMLInputElement;
          searchInput?.focus();
        }, 100);
      },
      category: 'Navigation',
    },
    {
      keys: ['?'],
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcutsHelp(true),
      category: 'Help',
    },
    {
      keys: ['ctrl+h'],
      description: 'Show help system',
      action: () => showHelp(),
      category: 'Help',
    },
    {
      keys: ['ctrl+n'],
      description: 'New investigation',
      action: () => {
        setActiveTab('investigations');
        toast.success('New Investigation', 'Navigate to investigations to create');
      },
      category: 'Investigations',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Mock current user for presence system
  const currentUser = {
    id: 'current-user',
    name: 'Intelligence Analyst',
    email: 'analyst@intelgraph.com',
    role: 'analyst' as const,
    status: 'active' as const,
    lastSeen: Date.now(),
  };

  // AI Assistant context
  const aiContext = {
    currentInvestigation: selectedInvestigation?.name,
    selectedEntities: [],
    recentSearches: [],
  };

  const tabs = [
    { key: 'overview', label: '🏠 Overview', icon: '🏠' },
    { key: 'investigations', label: '🔍 Investigations', icon: '🔍' },
    { key: 'search', label: '🔎 Advanced Search', icon: '🔎' },
    { key: 'export', label: '📤 Data Export', icon: '📤' },
    { key: 'analytics', label: '📊 Analytics', icon: '📊' },
    { key: 'ai-assistant', label: '🤖 AI Assistant', icon: '🤖' },
    { key: 'graph-viz', label: '🌐 Graph Visualization', icon: '🌐' },
    { key: 'timeline', label: '⏰ Timeline Analysis', icon: '⏰' },
    { key: 'threat-intel', label: '🛡️ Threat Intelligence', icon: '🛡️' },
    { key: 'mlops', label: '🧠 MLOps', icon: '🧠' },
    { key: 'collaboration', label: '👥 Collaboration', icon: '👥' },
    { key: 'security', label: '🔒 Security', icon: '🔒' },
    { key: 'monitoring', label: '📈 Monitoring', icon: '📈' },
    { key: 'integrations', label: '🔌 Integrations', icon: '🔌' },
    { key: 'ai-recommendations', label: '🔮 AI Recommendations', icon: '🔮' },
    { key: 'enterprise', label: '💼 Enterprise', icon: '💼' },
    { key: 'social-network', label: '🕸️ Social Network', icon: '🕸️' },
    { key: 'behavioral', label: '🧬 Behavioral Analytics', icon: '🧬' },
    { key: 'case-management', label: '📋 Case Management', icon: '📋' },
    { key: 'threat-hunting', label: '🎯 Threat Hunting', icon: '🎯' },
    { key: 'intel-feeds', label: '📡 Intelligence Feeds', icon: '📡' },
  ] as const;

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      {/* Performance Monitor */}
      <PerformanceMonitor enabled={true} />

      {/* Help System */}
      <HelpComponent />

      {/* Shortcuts Help */}
      <ShortcutsHelp
        shortcuts={shortcuts}
        isVisible={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      <header style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '600', marginBottom: '8px' }}>
              IntelGraph Platform
            </h1>
            <p className="muted" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
              Intelligence Analysis & Graph Visualization System
            </p>
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => showHelp('getting-started')}
              className="btn-secondary"
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              title="Get help (Ctrl+H)"
            >
              📚 Help
            </button>

            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="btn-secondary"
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              title="Keyboard shortcuts (?)"
            >
              ⌨️ Shortcuts
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid var(--hairline)',
            marginBottom: '24px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {tabs.map((tab) => (
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
                transition: 'all 0.2s',
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
          <div
            className="panel"
            style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#f8f9fa' }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#1a73e8',
              }}
            >
              🚀 Platform Status
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <ServerStatus />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
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
                  fontSize: '14px',
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
                  fontSize: '14px',
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {quickActions.map((item, index) => (
                <div
                  key={index}
                  className="panel"
                  style={{ padding: '16px', cursor: 'pointer' }}
                  onClick={item.action}
                >
                  <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>{item.title}</h4>
                  <p className="muted note" style={{ marginBottom: '12px' }}>
                    {item.description}
                  </p>
                  <div style={{ color: '#1a73e8', fontSize: '14px', fontWeight: '500' }}>
                    → Try it now
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              className="panel"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveTab('graph-viz')}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>🌐 Graph Analysis</h3>
              <p className="muted note">Interactive graph visualization with physics simulation</p>
              <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
                Neo4j • D3.js • Canvas Rendering
              </div>
            </div>

            <div
              className="panel"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveTab('social-network')}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>🕸️ Social Network Analysis</h3>
              <p className="muted note">Advanced relationship mapping and community detection</p>
              <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
                Centrality • Communities • Influence
              </div>
            </div>

            <div
              className="panel"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveTab('behavioral')}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>🧬 Behavioral Analytics</h3>
              <p className="muted note">Pattern recognition and anomaly detection engine</p>
              <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
                ML-Based • Multi-dimensional • Real-time
              </div>
            </div>

            <div
              className="panel"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveTab('threat-hunting')}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>🎯 Threat Hunting</h3>
              <p className="muted note">Proactive threat detection with dark web monitoring</p>
              <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
                MITRE ATT&CK • Dark Web • Proactive
              </div>
            </div>

            <div
              className="panel"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveTab('intel-feeds')}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>📡 Intelligence Feeds</h3>
              <p className="muted note">Real-time feeds with automated enrichment</p>
              <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
                Multi-source • STIX/TAXII • Automated
              </div>
            </div>

            <div
              className="panel"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveTab('case-management')}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>📋 Case Management</h3>
              <p className="muted note">Comprehensive case lifecycle with evidence tracking</p>
              <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
                Evidence • Reports • Collaboration
              </div>
            </div>

            <div
              className="panel"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveTab('ai-assistant')}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>🤖 AI Assistant</h3>
              <p className="muted note">Context-aware investigation assistance</p>
              <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
                NLP • Voice Input • Multi-modal
              </div>
            </div>

            <div
              className="panel"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveTab('security')}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>🔒 Security & Compliance</h3>
              <p className="muted note">Comprehensive audit framework and controls</p>
              <div style={{ marginTop: '12px', color: '#6c757d', fontSize: '12px' }}>
                ABAC • RBAC • Audit Trail
              </div>
            </div>
          </div>

          {/* Overview Tab Additional Content */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
              marginTop: '24px',
            }}
          >
            <GraphPreview
              title="📊 Graph Overview"
              height={300}
              maxNodes={15}
              onNodeClick={(node: unknown) => console.log('Clicked node:', node)}
            />

            <RealTimePresence
              currentUser={currentUser}
              onUserClick={(user: unknown) => console.log('Clicked user:', user)}
              className="h-80"
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
              <div>
                <strong>Entity Search:</strong> <code>type:person john</code> or{' '}
                <code>confidence:&gt;80</code>
              </div>
              <div>
                <strong>Investigation:</strong> <code>investigation:APT-2024-001</code>
              </div>
              <div>
                <strong>Date Range:</strong> <code>created:2024-01-01..2024-12-31</code>
              </div>
              <div>
                <strong>Boolean:</strong> <code>malware AND (APT OR campaign)</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <DataExport
            investigationId={selectedInvestigation?.id}
            selectedEntities={[]}
            onExportComplete={(result: any) => {
              console.log('Export completed:', result);
              // Could show notification here
            }}
            showReports={true}
          />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div>
          <AdvancedAnalyticsDashboard
            investigationId={selectedInvestigation?.id}
            timeRange="24h"
            className="max-w-full"
          />
        </div>
      )}

      {activeTab === 'ai-assistant' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            <div style={{ height: '70vh' }}>
              <EnhancedAIAssistant
                context={aiContext}
                onActionRequest={(action: any) => {
                  console.log('AI requested action:', action);
                  toast.info('AI Action', `Action requested: ${action.type}`);
                }}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'graph-viz' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🌐 Interactive Graph Visualization
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced graph analysis with physics simulation, multi-select, and real-time
              performance monitoring
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <InteractiveGraphCanvas
              investigationId={selectedInvestigation?.id}
              onNodeSelect={(nodes: any[]) => {
                console.log('Selected nodes:', nodes);
                toast.info('Graph Selection', `Selected ${nodes.length} node(s)`);
              }}
              onEdgeSelect={(edges: any[]) => {
                console.log('Selected edges:', edges);
                toast.info('Graph Selection', `Selected ${edges.length} edge(s)`);
              }}
              layoutAlgorithm="force"
              enablePhysics={true}
              showPerformanceMetrics={true}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              ⏰ Temporal Analysis & Timeline
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Interactive timeline with event clustering, anomaly detection, and pattern analysis
            </p>
          </div>

          <div
            style={{
              height: '75vh',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <TemporalAnalysis
              investigationId={selectedInvestigation?.id}
              onEventSelect={(event: any) => {
                console.log('Selected event:', event);
                toast.info('Timeline Event', `Selected: ${event.title}`);
              }}
              onTimeRangeChange={(start: Date, end: Date) => {
                console.log('Time range changed:', start, end);
                toast.info(
                  'Timeline',
                  `Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                );
              }}
              showClusters={true}
              showAnomalies={true}
              enableZoom={true}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'threat-intel' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🛡️ Threat Intelligence Hub
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Comprehensive threat intelligence with IOCs, campaigns, actors, and real-time feeds
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <ThreatIntelligenceHub
              investigationId={selectedInvestigation?.id}
              onIndicatorSelect={(indicator: any) => {
                console.log('Selected threat indicator:', indicator);
                toast.info('Threat Intel', `Selected: ${indicator.type} ${indicator.value}`);
              }}
              onCampaignSelect={(campaign: any) => {
                console.log('Selected campaign:', campaign);
                toast.info('Campaign', `Selected: ${campaign.name}`);
              }}
              onActorSelect={(actor: any) => {
                console.log('Selected actor:', actor);
                toast.info('Threat Actor', `Selected: ${actor.name}`);
              }}
              autoRefresh={true}
              refreshInterval={300000}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'mlops' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🧠 MLOps Model Management
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              End-to-end ML lifecycle management with training, deployment, monitoring, and
              experimentation
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <ModelManagementDashboard
              investigationId={selectedInvestigation?.id}
              onModelSelect={(model) => {
                console.log('Selected model:', model);
                toast.info('MLOps', `Selected: ${model.name} ${model.version}`);
              }}
              onDeployModel={(modelId, environment) => {
                console.log('Deploying model:', modelId, 'to', environment);
                toast.success('MLOps', `Deploying model ${modelId} to ${environment}`);
              }}
              onExperimentSelect={(experiment) => {
                console.log('Selected experiment:', experiment);
                toast.info('Experiment', `Selected: ${experiment.name}`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'collaboration' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              👥 Collaborative Workspace
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Real-time collaboration with live cursors, annotations, workspace sharing, and team
              coordination
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <CollaborativeWorkspace
              investigationId={selectedInvestigation?.id}
              currentUser={currentUser}
              onCollaborationEvent={(event) => {
                console.log('Collaboration event:', event);
                toast.info('Collaboration', `${event.type}: ${event.userId}`);
              }}
              onWorkspaceShare={(workspaceId, users) => {
                console.log('Workspace shared:', workspaceId, users);
                toast.success('Workspace', `Shared with ${users.length} user(s)`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🔒 Security Audit Dashboard
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Comprehensive security monitoring with event tracking, compliance rules, and risk
              assessment
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <SecurityAuditDashboard
              investigationId={selectedInvestigation?.id}
              currentUser={currentUser}
              onSecurityEvent={(event) => {
                console.log('Security event:', event);
                if (event.severity === 'high' || event.severity === 'critical') {
                  toast.error('Security Alert', `${event.category}: ${event.description}`);
                } else {
                  toast.info('Security Event', event.description);
                }
              }}
              onComplianceViolation={(violation) => {
                console.log('Compliance violation:', violation);
                toast.warning('Compliance', `${violation.rule}: ${violation.description}`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              📈 System Observability
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              System-wide monitoring with service health, performance metrics, log aggregation, and
              alerting
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <SystemObservabilityDashboard
              investigationId={selectedInvestigation?.id}
              onServiceAlert={(service, alert) => {
                console.log('Service alert:', service, alert);
                toast.warning('System Alert', `${service}: ${alert.message}`);
              }}
              onMetricThreshold={(metric, threshold) => {
                console.log('Metric threshold:', metric, threshold);
                toast.info('Performance', `${metric.name} exceeded ${threshold.value}`);
              }}
              onLogEvent={(logEvent) => {
                console.log('Log event:', logEvent);
                if (logEvent.level === 'ERROR') {
                  toast.error('System Error', logEvent.message.substring(0, 100));
                }
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🔌 Data Connectors & Integrations
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced data integration with multiple connector types, health monitoring, and data
              flow tracking
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <DataConnectorsDashboard
              investigationId={selectedInvestigation?.id}
              onConnectorStatus={(connector, status) => {
                console.log('Connector status:', connector, status);
                if (status === 'error' || status === 'disconnected') {
                  toast.error('Connector', `${connector.name}: ${status}`);
                } else if (status === 'connected') {
                  toast.success('Connector', `${connector.name}: Connected`);
                }
              }}
              onDataFlow={(source, target, records) => {
                console.log('Data flow:', source, target, records);
                toast.info('Data Flow', `${source} → ${target}: ${records} records`);
              }}
              onTemplateApply={(template, connector) => {
                console.log('Template applied:', template, connector);
                toast.success('Template', `Applied ${template.name} to ${connector.name}`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'ai-recommendations' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🔮 AI Investigation Recommendations
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              AI-powered investigation assistance with ML-based recommendations and similar case
              analysis
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <InvestigationRecommendationsEngine
              investigationId={selectedInvestigation?.id}
              context={aiContext}
              onRecommendationSelect={(recommendation) => {
                console.log('Selected recommendation:', recommendation);
                toast.info('AI Recommendation', `${recommendation.type}: ${recommendation.title}`);
              }}
              onSimilarCaseSelect={(similarCase) => {
                console.log('Selected similar case:', similarCase);
                toast.info(
                  'Similar Case',
                  `${similarCase.title} (${similarCase.similarity}% match)`,
                );
              }}
              onStrategyApply={(strategy) => {
                console.log('Applied strategy:', strategy);
                toast.success('Strategy Applied', `${strategy.name}: ${strategy.description}`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'enterprise' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              💼 Enterprise Dashboard
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Executive-level dashboard with role-based widgets, automated reporting, and
              customizable analytics
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <EnterpriseDashboard
              investigationId={selectedInvestigation?.id}
              currentUser={currentUser}
              onReportGenerate={(report) => {
                console.log('Report generated:', report);
                toast.success('Report Generated', `${report.name} (${report.format})`);
              }}
              onWidgetInteraction={(widget, action, data) => {
                console.log('Widget interaction:', widget, action, data);
                toast.info('Dashboard', `${widget.title}: ${action}`);
              }}
              onRoleChange={(newRole) => {
                console.log('Role changed:', newRole);
                toast.info('Role Updated', `Dashboard view: ${newRole}`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'social-network' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🕸️ Social Network Analysis
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced social network analysis with graph visualization, centrality metrics, and
              community detection
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <SocialNetworkAnalysis
              investigationId={selectedInvestigation?.id}
              onNodeSelect={(nodes) => {
                console.log('Selected social nodes:', nodes);
                toast.info('Social Network', `Selected ${nodes.length} node(s)`);
              }}
              onCommunitySelect={(community) => {
                console.log('Selected community:', community);
                toast.info(
                  'Community',
                  `Selected: ${community.name} (${community.members.length} members)`,
                );
              }}
              onMetricSelect={(metric, value) => {
                console.log('Metric selected:', metric, value);
                toast.info('Network Metric', `${metric}: ${value}`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'behavioral' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🧬 Behavioral Analytics
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced behavioral pattern analysis with anomaly detection across temporal, spatial,
              and digital patterns
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <BehavioralAnalytics
              investigationId={selectedInvestigation?.id}
              onProfileSelect={(profile) => {
                console.log('Selected behavioral profile:', profile);
                toast.info(
                  'Behavioral Profile',
                  `Selected: ${profile.entityId} (Risk: ${profile.riskScore}%)`,
                );
              }}
              onAnomalyDetected={(anomaly) => {
                console.log('Anomaly detected:', anomaly);
                toast.warning('Anomaly Detected', `${anomaly.type}: ${anomaly.description}`);
              }}
              onPatternAnalysis={(analysis) => {
                console.log('Pattern analysis:', analysis);
                toast.info(
                  'Pattern Analysis',
                  `${analysis.type}: ${analysis.confidence}% confidence`,
                );
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'case-management' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              📋 Case Management & Reporting
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Comprehensive case lifecycle management with evidence tracking, automated reporting,
              and team collaboration
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <ReportingCaseManagement
              investigationId={selectedInvestigation?.id}
              currentUser={currentUser}
              onCaseSelect={(caseFile) => {
                console.log('Selected case:', caseFile);
                toast.info('Case Selected', `${caseFile.title} (${caseFile.caseType})`);
              }}
              onReportGenerate={(report) => {
                console.log('Report generated:', report);
                toast.success('Report Generated', `${report.template} - ${report.format}`);
              }}
              onEvidenceUpdate={(evidence) => {
                console.log('Evidence updated:', evidence);
                toast.info('Evidence', `Updated: ${evidence.type} - ${evidence.name}`);
              }}
              onTaskAssign={(task, assignee) => {
                console.log('Task assigned:', task, assignee);
                toast.info('Task Assigned', `${task.title} → ${assignee.name}`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'threat-hunting' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              🎯 Threat Hunting & Dark Web Monitoring
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced threat hunting with MITRE ATT&CK integration, dark web monitoring, and
              proactive threat detection
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <ThreatHuntingDarkWeb
              investigationId={selectedInvestigation?.id}
              onHuntCreate={(hunt) => {
                console.log('Threat hunt created:', hunt);
                toast.success('Threat Hunt', `Created: ${hunt.name} (${hunt.type})`);
              }}
              onThreatDetected={(threat) => {
                console.log('Threat detected:', threat);
                toast.warning('Threat Detected', `${threat.type}: ${threat.description}`);
              }}
              onDarkWebHit={(hit) => {
                console.log('Dark web hit:', hit);
                toast.info('Dark Web', `New content: ${hit.platform} - ${hit.keywords.join(', ')}`);
              }}
              onTTPMapping={(ttp) => {
                console.log('TTP mapped:', ttp);
                toast.info('MITRE ATT&CK', `Mapped: ${ttp.tactic} - ${ttp.technique}`);
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {activeTab === 'intel-feeds' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>
              📡 Intelligence Feeds & Enrichment
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Real-time intelligence feeds with automated enrichment, correlation engine, and
              multi-source data integration
            </p>
          </div>

          <div style={{ height: '75vh', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <IntelligenceFeedsEnrichment
              investigationId={selectedInvestigation?.id}
              onFeedStatus={(feed, status) => {
                console.log('Feed status:', feed, status);
                if (status === 'connected') {
                  toast.success('Intelligence Feed', `${feed.provider}: Connected`);
                } else if (status === 'error') {
                  toast.error('Intelligence Feed', `${feed.provider}: Connection error`);
                }
              }}
              onEnrichmentComplete={(entity, enrichments) => {
                console.log('Enrichment completed:', entity, enrichments);
                toast.info(
                  'Enrichment',
                  `${entity.type} enriched with ${enrichments.length} sources`,
                );
              }}
              onCorrelationFound={(correlation) => {
                console.log('Correlation found:', correlation);
                toast.warning(
                  'Correlation Alert',
                  `${correlation.type}: ${correlation.entities.length} entities`,
                );
              }}
              onAlertGenerated={(alert) => {
                console.log('Alert generated:', alert);
                if (alert.severity === 'high' || alert.severity === 'critical') {
                  toast.error('Intelligence Alert', `${alert.title}: ${alert.description}`);
                } else {
                  toast.info('Intelligence Alert', alert.title);
                }
              }}
              className="h-full w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with ToastProvider
function HomeRoute() {
  return (
    <ToastProvider position="top-right" maxToasts={5}>
      <HomeRouteInner />
    </ToastProvider>
  );
}

export default HomeRoute;
