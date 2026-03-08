"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
const react_redux_1 = require("react-redux");
const ServerStatus_1 = __importDefault(require("../components/ServerStatus"));
const AdvancedSearch_1 = __importDefault(require("../components/AdvancedSearch"));
const GraphPreview_1 = __importDefault(require("../components/GraphPreview"));
const DataExport_1 = __importDefault(require("../components/DataExport"));
const InvestigationManager_1 = __importDefault(require("../components/InvestigationManager"));
const PerformanceMonitor_1 = __importDefault(require("../components/PerformanceMonitor"));
const HelpSystem_1 = require("../components/HelpSystem");
const KeyboardShortcuts_1 = require("../components/KeyboardShortcuts");
const ToastContainer_1 = require("../components/ToastContainer");
const EnhancedAIAssistant_1 = __importDefault(require("../components/ai-enhanced/EnhancedAIAssistant"));
const RealTimePresence_1 = __importDefault(require("../components/collaboration/RealTimePresence"));
const AdvancedAnalyticsDashboard_1 = __importDefault(require("../components/analytics/AdvancedAnalyticsDashboard"));
const InteractiveGraphCanvas_1 = __importDefault(require("../components/visualization/InteractiveGraphCanvas"));
const TemporalAnalysis_1 = __importDefault(require("../components/timeline/TemporalAnalysis"));
const ThreatIntelligenceHub_1 = __importDefault(require("../components/intelligence/ThreatIntelligenceHub"));
const ModelManagementDashboard_1 = __importDefault(require("../components/mlops/ModelManagementDashboard"));
const CollaborativeWorkspace_1 = __importDefault(require("../components/collaboration/CollaborativeWorkspace"));
const SecurityAuditDashboard_1 = __importDefault(require("../components/security/SecurityAuditDashboard"));
const SystemObservabilityDashboard_1 = __importDefault(require("../components/monitoring/SystemObservabilityDashboard"));
const DataConnectorsDashboard_1 = __importDefault(require("../components/integrations/DataConnectorsDashboard"));
const InvestigationRecommendationsEngine_1 = __importDefault(require("../components/ai/InvestigationRecommendationsEngine"));
const EnterpriseDashboard_1 = __importDefault(require("../components/reporting/EnterpriseDashboard"));
const SocialNetworkAnalysis_1 = __importDefault(require("../components/social/SocialNetworkAnalysis"));
const BehavioralAnalytics_1 = __importDefault(require("../components/behavioral/BehavioralAnalytics"));
const ReportingCaseManagement_1 = __importDefault(require("../components/reporting/ReportingCaseManagement"));
const ThreatHuntingDarkWeb_1 = __importDefault(require("../components/threat/ThreatHuntingDarkWeb"));
const IntelligenceFeedsEnrichment_1 = __importDefault(require("../components/intelligence/IntelligenceFeedsEnrichment"));
const GraphAnomalyWidget_1 = __importDefault(require("../components/dashboard/GraphAnomalyWidget"));
const withAuthorization_1 = require("../auth/withAuthorization");
function HomeRouteInner() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [actionId, setActionId] = (0, react_1.useState)('');
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [selectedInvestigation, setSelectedInvestigation] = (0, react_1.useState)(null);
    const [showShortcutsHelp, setShowShortcutsHelp] = (0, react_1.useState)(false);
    const graphStats = (0, react_redux_1.useSelector)((state) => state.graph?.graphStats);
    const { showHelp, HelpComponent } = (0, HelpSystem_1.useHelpSystem)();
    const toast = (0, ToastContainer_1.useToast)();
    const { filterByAccess, tenant: tenantScope } = (0, withAuthorization_1.useAuthorization)();
    const handleNavigateToAction = () => {
        if (actionId.trim()) {
            navigate(`/actions/${actionId.trim()}`);
        }
    };
    const quickActions = (0, react_1.useMemo)(() => [
        {
            title: 'Test Action Safety',
            description: 'Try action ID: test-action-123',
            action: () => navigate('/actions/test-action-123'),
            policy: 'actions:read',
        },
        {
            title: 'Sample Investigation',
            description: 'View sample action with safety controls',
            action: () => navigate('/actions/sample-investigation'),
            policy: 'actions:read',
        },
    ], [navigate]);
    const authorizedQuickActions = (0, react_1.useMemo)(() => filterByAccess(quickActions, (item) => ({
        action: item.policy || 'actions:read',
        tenantId: tenantScope,
    })), [filterByAccess, quickActions, tenantScope]);
    const handleSearchResultSelect = (result) => {
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
                    const searchInput = document.querySelector('input[placeholder*="Search"]');
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
        {
            keys: ['escape'],
            description: 'Close modals and panels',
            action: () => {
                setShowShortcutsHelp(false);
            },
            category: 'General',
        },
    ];
    (0, KeyboardShortcuts_1.useKeyboardShortcuts)(shortcuts);
    // Mock current user for presence system
    const currentUser = {
        id: 'current-user',
        name: 'Intelligence Analyst',
        email: 'analyst@intelgraph.com',
        role: 'analyst',
        status: 'active',
        lastSeen: Date.now(),
    };
    // AI Assistant context
    const aiContext = {
        currentInvestigation: selectedInvestigation?.name,
        selectedEntities: [],
        recentSearches: [],
    };
    const graphData = (0, react_1.useMemo)(() => {
        const baseId = selectedInvestigation?.id ?? 'investigation-root';
        const baseLabel = selectedInvestigation?.name ?? 'Current Investigation';
        const centerNode = {
            id: baseId,
            label: baseLabel,
            type: 'event',
            x: 0,
            y: 0,
            size: 32,
            color: '#42a5f5',
            risk: 55,
            confidence: 90,
            metadata: {},
        };
        const satelliteConfigs = [
            {
                id: 'intel',
                label: 'Intel Feeds',
                color: '#ef5350',
                type: 'document',
                risk: 45,
                confidence: 80,
            },
            {
                id: 'entities',
                label: 'Entities',
                color: '#ab47bc',
                type: 'person',
                risk: 60,
                confidence: 75,
            },
            {
                id: 'alerts',
                label: 'Alerts',
                color: '#ffa726',
                type: 'event',
                risk: 70,
                confidence: 65,
            },
            {
                id: 'patterns',
                label: 'Patterns',
                color: '#66bb6a',
                type: 'document',
                risk: 50,
                confidence: 85,
            },
        ];
        const satellites = satelliteConfigs.map((config, index, arr) => {
            const angle = (index / arr.length) * 2 * Math.PI;
            return {
                id: `${baseId}-${config.id}`,
                label: config.label,
                type: config.type,
                x: Math.cos(angle) * 200,
                y: Math.sin(angle) * 200,
                size: 18,
                color: config.color,
                risk: config.risk,
                confidence: config.confidence,
                metadata: {},
            };
        });
        const edges = satellites.map((node, index) => ({
            id: `${baseId}-edge-${index}`,
            source: centerNode.id,
            target: node.id,
            type: 'association',
            weight: 1,
            label: 'related',
            color: '#90caf9',
        }));
        return { nodes: [centerNode, ...satellites], edges };
    }, [selectedInvestigation?.id, selectedInvestigation?.name]);
    const recommendationContext = (0, react_1.useMemo)(() => ({
        investigationId: selectedInvestigation?.id ?? 'inv-default',
        currentEntities: [],
        currentRelationships: [],
        investigationTags: [],
        investigationType: 'general',
        priority: 'medium',
        availableResources: ['analyst', 'ai-tools', 'intel-feeds'],
        complianceRequirements: ['aml', 'kyc'],
    }), [selectedInvestigation?.id]);
    const timelineEvents = (0, react_1.useMemo)(() => [
        {
            id: 'evt-start',
            timestamp: Date.now() - 6 * 60 * 60 * 1000,
            title: 'Investigation Created',
            description: 'Initial investigation kickoff',
            type: 'investigation',
            severity: 'medium',
            entities: [],
            confidence: 90,
        },
        {
            id: 'evt-alert',
            timestamp: Date.now() - 3 * 60 * 60 * 1000,
            title: 'High-Risk Alert',
            description: 'Suspicious transaction detected',
            type: 'threat',
            severity: 'high',
            entities: [],
            confidence: 80,
        },
        {
            id: 'evt-action',
            timestamp: Date.now() - 60 * 60 * 1000,
            title: 'Analyst Action',
            description: 'Analyst updated case findings',
            type: 'user_action',
            severity: 'low',
            entities: [],
            confidence: 70,
        },
    ], [selectedInvestigation?.id]);
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
    ];
    return (<div style={{ padding: '24px', minHeight: '100vh' }}>
      {/* Performance Monitor */}
      <PerformanceMonitor_1.default enabled={true}/>

      {/* Help System */}
      <HelpComponent />

      {/* Shortcuts Help */}
      <KeyboardShortcuts_1.ShortcutsHelp shortcuts={shortcuts} isVisible={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)}/>

      <header style={{ marginBottom: '24px' }}>
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px',
        }}>
          <div>
            <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '600',
            marginBottom: '8px',
        }}>
              IntelGraph Platform
            </h1>
            <p className="muted" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
              Intelligence Analysis & Graph Visualization System
            </p>
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => showHelp('getting-started')} className="btn-secondary" style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
        }} title="Get help (Ctrl+H)">
              📚 Help
            </button>

            <button onClick={() => setShowShortcutsHelp(true)} className="btn-secondary" style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
        }} title="Keyboard shortcuts (?)">
              ⌨️ Shortcuts
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
            display: 'flex',
            borderBottom: '2px solid var(--hairline)',
            marginBottom: '24px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
        }}>
          {tabs.map((tab) => (<button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '12px 20px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key
                    ? '2px solid #1a73e8'
                    : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? '600' : '400',
                color: activeTab === tab.key ? '#1a73e8' : '#666',
                transition: 'all 0.2s',
            }}>
              {tab.label}
            </button>))}
        </div>
      </header>

      {/* Tab Content */}
      {activeTab === 'overview' && (<div style={{ marginBottom: '32px' }}>
          <div className="panel" style={{
                padding: '24px',
                marginBottom: '24px',
                backgroundColor: '#f8f9fa',
            }}>
            <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#1a73e8',
            }}>
              🚀 Platform Status
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <ServerStatus_1.default />
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
            }}>
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
            <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '16px',
            }}>
              🔍 Navigate to Action
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input type="text" value={actionId} onChange={(e) => setActionId(e.target.value)} placeholder="Enter action ID..." style={{
                padding: '8px 12px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                flex: 1,
                fontSize: '14px',
            }} onKeyPress={(e) => e.key === 'Enter' && handleNavigateToAction()}/>
              <button onClick={handleNavigateToAction} disabled={!actionId.trim()} style={{
                padding: '8px 16px',
                backgroundColor: actionId.trim() ? '#1a73e8' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionId.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
            }}>
                Go
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '16px',
            }}>
              ⚡ Quick Actions
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
            }}>
              {authorizedQuickActions.length === 0 && (<div className="panel" style={{ padding: '16px' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>
                    No quick actions available
                  </h4>
                  <p className="muted note" style={{ marginBottom: '12px' }}>
                    Your current tenant or role does not allow the listed quick
                    actions.
                  </p>
                </div>)}
              {authorizedQuickActions.map((item, index) => (<div key={index} className="panel" style={{ padding: '16px', cursor: 'pointer' }} onClick={item.action}>
                  <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>
                    {item.title}
                  </h4>
                  <p className="muted note" style={{ marginBottom: '12px' }}>
                    {item.description}
                  </p>
                  <div style={{
                    color: '#1a73e8',
                    fontSize: '14px',
                    fontWeight: '500',
                }}>
                    → Try it now
                  </div>
                </div>))}
            </div>
          </div>

          <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
            }}>
            <div className="panel" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('graph-viz')}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
                🌐 Graph Analysis
              </h3>
              <p className="muted note">
                Interactive graph visualization with physics simulation
              </p>
              <div style={{
                marginTop: '12px',
                color: '#6c757d',
                fontSize: '12px',
            }}>
                Neo4j • D3.js • Canvas Rendering
              </div>
            </div>

            <div className="panel" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('social-network')}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
                🕸️ Social Network Analysis
              </h3>
              <p className="muted note">
                Advanced relationship mapping and community detection
              </p>
              <div style={{
                marginTop: '12px',
                color: '#6c757d',
                fontSize: '12px',
            }}>
                Centrality • Communities • Influence
              </div>
            </div>

            <div className="panel" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('behavioral')}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
                🧬 Behavioral Analytics
              </h3>
              <p className="muted note">
                Pattern recognition and anomaly detection engine
              </p>
              <div style={{
                marginTop: '12px',
                color: '#6c757d',
                fontSize: '12px',
            }}>
                ML-Based • Multi-dimensional • Real-time
              </div>
            </div>

            <div className="panel" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('threat-hunting')}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
                🎯 Threat Hunting
              </h3>
              <p className="muted note">
                Proactive threat detection with dark web monitoring
              </p>
              <div style={{
                marginTop: '12px',
                color: '#6c757d',
                fontSize: '12px',
            }}>
                MITRE ATT&CK • Dark Web • Proactive
              </div>
            </div>

            <div className="panel" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('intel-feeds')}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
                📡 Intelligence Feeds
              </h3>
              <p className="muted note">
                Real-time feeds with automated enrichment
              </p>
              <div style={{
                marginTop: '12px',
                color: '#6c757d',
                fontSize: '12px',
            }}>
                Multi-source • STIX/TAXII • Automated
              </div>
            </div>

            <div className="panel" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('case-management')}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
                📋 Case Management
              </h3>
              <p className="muted note">
                Comprehensive case lifecycle with evidence tracking
              </p>
              <div style={{
                marginTop: '12px',
                color: '#6c757d',
                fontSize: '12px',
            }}>
                Evidence • Reports • Collaboration
              </div>
            </div>

            <div className="panel" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('ai-assistant')}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
                🤖 AI Assistant
              </h3>
              <p className="muted note">
                Context-aware investigation assistance
              </p>
              <div style={{
                marginTop: '12px',
                color: '#6c757d',
                fontSize: '12px',
            }}>
                NLP • Voice Input • Multi-modal
              </div>
            </div>

            <div className="panel" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('security')}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>
                🔒 Security & Compliance
              </h3>
              <p className="muted note">
                Comprehensive audit framework and controls
              </p>
              <div style={{
                marginTop: '12px',
                color: '#6c757d',
                fontSize: '12px',
            }}>
                ABAC • RBAC • Audit Trail
              </div>
            </div>
          </div>

          {/* Overview Tab Additional Content */}
          <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '24px',
                marginTop: '24px',
            }}>
            <GraphPreview_1.default title="📊 Graph Overview" height={300} maxNodes={15} onNodeClick={(node) => console.log('Clicked node:', node)}/>

            <RealTimePresence_1.default currentUser={currentUser} onUserClick={(user) => console.log('Clicked user:', user)} className="h-80"/>
          </div>
        </div>)}

      {activeTab === 'investigations' && (<InvestigationManager_1.default onInvestigationSelect={setSelectedInvestigation} currentInvestigationId={selectedInvestigation?.id}/>)}

      {activeTab === 'search' && (<div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '16px',
            }}>
              🔎 Advanced Search & Analysis
            </h2>
            <AdvancedSearch_1.default onResultSelect={handleSearchResultSelect} placeholder="Search entities, investigations, actions, or upload data..." showFilters={true}/>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '16px',
            }}>
              🎯 Search Tips
            </h3>
            <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
              <div>
                <strong>Entity Search:</strong> <code>type:person john</code> or{' '}
                <code>confidence:&gt;80</code>
              </div>
              <div>
                <strong>Investigation:</strong>{' '}
                <code>investigation:APT-2024-001</code>
              </div>
              <div>
                <strong>Date Range:</strong>{' '}
                <code>created:2024-01-01..2024-12-31</code>
              </div>
              <div>
                <strong>Boolean:</strong>{' '}
                <code>malware AND (APT OR campaign)</code>
              </div>
            </div>
          </div>
        </div>)}

      {activeTab === 'export' && (<div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <DataExport_1.default investigationId={selectedInvestigation?.id} selectedEntities={[]} onExportComplete={(result) => {
                console.log('Export completed:', result);
                // Could show notification here
            }} showReports={true}/>
        </div>)}

      {activeTab === 'analytics' && (<div style={{ display: 'grid', gap: '24px' }}>
          <GraphAnomalyWidget_1.default investigationId={selectedInvestigation?.id} defaultEntityId={selectedInvestigation?.focusEntityId || selectedInvestigation?.entityId}/>
          <AdvancedAnalyticsDashboard_1.default investigationId={selectedInvestigation?.id} timeRange="24h" className="max-w-full"/>
        </div>)}

      {activeTab === 'ai-assistant' && (<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <material_1.Card sx={{ borderRadius: 3 }}>
              <material_1.CardContent>
                <material_1.Typography variant="h6" gutterBottom>
                  Assistant Context
                </material_1.Typography>
                <material_1.Stack direction="row" spacing={3}>
                  <material_1.Box>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Investigation
                    </material_1.Typography>
                    <material_1.Typography variant="body2">
                      {aiContext.currentInvestigation ?? 'None selected'}
                    </material_1.Typography>
                  </material_1.Box>
                  <material_1.Box>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Selected Entities
                    </material_1.Typography>
                    <material_1.Typography variant="body2">
                      {aiContext.selectedEntities.length}
                    </material_1.Typography>
                  </material_1.Box>
                  <material_1.Box>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Recent Searches
                    </material_1.Typography>
                    <material_1.Typography variant="body2">
                      {aiContext.recentSearches.length}
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.Stack>
              </material_1.CardContent>
            </material_1.Card>
            <material_1.Box sx={{ flex: 1 }}>
              <EnhancedAIAssistant_1.default />
            </material_1.Box>
          </div>
        </div>)}

      {activeTab === 'graph-viz' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🌐 Interactive Graph Visualization
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced graph analysis with physics simulation, multi-select, and
              real-time performance monitoring
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <InteractiveGraphCanvas_1.default data={graphData} layoutAlgorithm="force" physics={true} onSelectionChange={(nodes) => {
                toast.info('Graph Selection', `Selected ${nodes.length} node(s)`);
            }} className="h-full w-full"/>
          </div>
        </div>)}

      {activeTab === 'timeline' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              ⏰ Temporal Analysis & Timeline
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Interactive timeline with event clustering, anomaly detection, and
              pattern analysis
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
            }}>
            <TemporalAnalysis_1.default events={timelineEvents} investigationId={selectedInvestigation?.id} onEventSelect={(event) => {
                console.log('Selected event:', event);
                toast.info('Timeline Event', `Selected: ${event.title}`);
            }} onTimeRangeChange={({ start, end }) => {
                const startDate = new Date(start);
                const endDate = new Date(end);
                console.log('Time range changed:', startDate, endDate);
                toast.info('Timeline', `Range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
            }} showClusters={true} showAnomalies={true} enableZoom={true} className="h-full w-full"/>
          </div>
        </div>)}

      {activeTab === 'threat-intel' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🛡️ Threat Intelligence Hub
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Comprehensive threat intelligence with IOCs, campaigns, actors,
              and real-time feeds
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <ThreatIntelligenceHub_1.default investigationId={selectedInvestigation?.id} onIndicatorSelect={(indicator) => {
                console.log('Selected threat indicator:', indicator);
                toast.info('Threat Intel', `Selected: ${indicator.type} ${indicator.value}`);
            }} onCampaignSelect={(campaign) => {
                console.log('Selected campaign:', campaign);
                toast.info('Campaign', `Selected: ${campaign.name}`);
            }} onActorSelect={(actor) => {
                console.log('Selected actor:', actor);
                toast.info('Threat Actor', `Selected: ${actor.name}`);
            }} autoRefresh={true} refreshInterval={300000} className="h-full w-full"/>
          </div>
        </div>)}

      {activeTab === 'mlops' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🧠 MLOps Model Management
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              End-to-end ML lifecycle management with training, deployment,
              monitoring, and experimentation
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <ModelManagementDashboard_1.default investigationId={selectedInvestigation?.id} onModelSelect={(model) => {
                console.log('Selected model:', model);
                toast.info('MLOps', `Selected: ${model.name} ${model.version}`);
            }} onDeployModel={(modelId, environment) => {
                console.log('Deploying model:', modelId, 'to', environment);
                toast.success('MLOps', `Deploying model ${modelId} to ${environment}`);
            }} onExperimentSelect={(experiment) => {
                console.log('Selected experiment:', experiment);
                toast.info('Experiment', `Selected: ${experiment.name}`);
            }}/>
          </div>
        </div>)}

      {activeTab === 'collaboration' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              👥 Collaborative Workspace
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Real-time collaboration with live cursors, annotations, workspace
              sharing, and team coordination
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <CollaborativeWorkspace_1.default investigationId={selectedInvestigation?.id} currentUser={currentUser} onWorkspaceShare={(workspace) => {
                console.log('Workspace shared:', workspace);
                const count = Array.isArray(workspace?.participants)
                    ? workspace.participants.length
                    : 0;
                toast.success('Workspace', `Shared with ${count} user(s)`);
            }}/>
          </div>
        </div>)}

      {activeTab === 'security' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🔒 Security Audit Dashboard
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Comprehensive security monitoring with event tracking, compliance
              rules, and risk assessment
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <SecurityAuditDashboard_1.default investigationId={selectedInvestigation?.id} onSecurityAlert={(event) => {
                console.log('Security event:', event);
                const message = event.severity === 'high' || event.severity === 'critical'
                    ? 'Security Alert'
                    : 'Security Event';
                toast.info(message, event.eventType);
            }} onComplianceViolation={(rule, event) => {
                console.log('Compliance violation:', rule, event);
                toast.warning('Compliance', `${rule.name}: ${event.eventType}`);
            }} className="h-full w-full"/>
          </div>
        </div>)}

      {activeTab === 'monitoring' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              📈 System Observability
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              System-wide monitoring with service health, performance metrics,
              log aggregation, and alerting
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <SystemObservabilityDashboard_1.default investigationId={selectedInvestigation?.id} refreshInterval={60000} onAlertAcknowledge={(alertId) => {
                toast.warning('System Alert', `Alert acknowledged: ${alertId}`);
            }} onMetricThresholdExceeded={(metric, value, threshold) => {
                toast.info('Performance Threshold', `${metric} value ${value.toFixed?.(2) ?? value} (limit ${threshold})`);
            }} className="h-full w-full"/>
          </div>
        </div>)}

      {activeTab === 'integrations' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🔌 Data Connectors & Integrations
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced data integration with multiple connector types, health
              monitoring, and data flow tracking
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <DataConnectorsDashboard_1.default investigationId={selectedInvestigation?.id} onConnectorAdd={(connector) => toast.success('Connector Added', connector.name)} onConnectorRemove={(connectorId) => toast.warning('Connector Removed', connectorId)} onDataImported={(connectorId, recordCount) => toast.info('Data Imported', `${connectorId}: ${recordCount.toLocaleString()} records`)} className="h-full w-full"/>
          </div>
        </div>)}

      {activeTab === 'ai-recommendations' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🔮 AI Investigation Recommendations
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              AI-powered investigation assistance with ML-based recommendations
              and similar case analysis
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <InvestigationRecommendationsEngine_1.default investigationId={selectedInvestigation?.id} context={recommendationContext} onRecommendationAccept={(recommendation) => {
                toast.success('Recommendation Accepted', recommendation.title);
            }} onRecommendationReject={(recommendationId) => {
                toast.warning('Recommendation Rejected', recommendationId);
            }} onStrategySelect={(strategy) => {
                toast.info('Strategy Selected', strategy.name);
            }} className="h-full w-full"/>
          </div>
        </div>)}

      {activeTab === 'enterprise' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              💼 Enterprise Dashboard
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Executive-level dashboard with role-based widgets, automated
              reporting, and customizable analytics
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <EnterpriseDashboard_1.default organizationId={selectedInvestigation?.id} userRole={currentUser.role} onReportGenerate={(templateId) => {
                toast.success('Report Generated', templateId);
            }} onWidgetInteraction={(widgetId, action) => {
                toast.info('Dashboard', `${widgetId}: ${action}`);
            }}/>
          </div>
        </div>)}

      {activeTab === 'social-network' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🕸️ Social Network Analysis
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced social network analysis with graph visualization,
              centrality metrics, and community detection
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <SocialNetworkAnalysis_1.default investigationId={selectedInvestigation?.id} onNodeSelect={(node) => {
                toast.info('Social Network', `Selected ${node?.properties?.name ?? node?.id ?? 'node'}`);
            }} onCommunitySelect={(community) => {
                toast.info('Community', `${community?.name ?? community?.id} (${community?.properties?.size ?? 0} members)`);
            }}/>
          </div>
        </div>)}

      {activeTab === 'behavioral' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🧬 Behavioral Analytics
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced behavioral pattern analysis with anomaly detection across
              temporal, spatial, and digital patterns
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <BehavioralAnalytics_1.default investigationId={selectedInvestigation?.id} onProfileSelect={(profile) => {
                console.log('Selected behavioral profile:', profile);
                toast.info('Behavioral Profile', `Selected: ${profile.entityId} (Risk: ${profile.riskScore}%)`);
            }} onAnomalyDetected={(anomaly) => {
                console.log('Anomaly detected:', anomaly);
                toast.warning('Anomaly Detected', `${anomaly.type}: ${anomaly.description}`);
            }} onPatternIdentified={(pattern) => {
                console.log('Pattern identified:', pattern);
                toast.info('Pattern Analysis', `${pattern.type}: ${pattern.confidence ?? 0}% confidence`);
            }}/>
          </div>
        </div>)}

      {activeTab === 'case-management' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              📋 Case Management & Reporting
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Comprehensive case lifecycle management with evidence tracking,
              automated reporting, and team collaboration
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <ReportingCaseManagement_1.default investigationId={selectedInvestigation?.id} onCaseSelect={(caseFile) => {
                console.log('Selected case:', caseFile);
                toast.info('Case Selected', `${caseFile.title} (${caseFile.caseType})`);
            }} onReportGenerated={(report) => {
                console.log('Report generated:', report);
                toast.success('Report Generated', `${report.template} - ${report.format}`);
            }} onTaskAssigned={(task) => {
                toast.info('Task Assigned', task.title ?? 'Task updated');
            }} onExportComplete={(exportInfo) => {
                toast.success('Case Export', exportInfo?.format ?? 'Export');
            }}/>
          </div>
        </div>)}

      {activeTab === 'threat-hunting' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              🎯 Threat Hunting & Dark Web Monitoring
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Advanced threat hunting with MITRE ATT&CK integration, dark web
              monitoring, and proactive threat detection
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <ThreatHuntingDarkWeb_1.default investigationId={selectedInvestigation?.id} onHuntingResultFound={(result) => {
                toast.success('Threat Hunt', result?.name ?? 'New hunt result');
            }} onDarkWebAlertTriggered={(alert) => {
                toast.warning('Dark Web Alert', alert?.title ?? 'Alert');
            }} onThreatIntelUpdate={(intel) => {
                toast.info('Threat Intel Update', intel?.title ?? 'Update');
            }} onRuleTriggered={(rule) => {
                toast.info('Hunting Rule Triggered', rule?.name ?? 'Rule');
            }}/>
          </div>
        </div>)}

      {activeTab === 'intel-feeds' && (<div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '8px',
            }}>
              📡 Intelligence Feeds & Enrichment
            </h2>
            <p className="muted" style={{ fontSize: '1rem', marginBottom: '20px' }}>
              Real-time intelligence feeds with automated enrichment,
              correlation engine, and multi-source data integration
            </p>
          </div>

          <div style={{
                height: '75vh',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <IntelligenceFeedsEnrichment_1.default investigationId={selectedInvestigation?.id} onNewIntelligence={(intel) => {
                if (intel?.provider) {
                    toast.success('Intelligence Feed', `${intel.provider}: new intelligence received`);
                }
                else {
                    toast.info('Intelligence Feed', 'New intelligence ingested');
                }
            }} onEnrichmentComplete={(entity) => {
                console.log('Enrichment completed:', entity);
                toast.info('Enrichment', `${entity.id} enriched via ${entity.enrichmentSources.length} sources`);
            }} onCorrelationMatch={(correlation) => {
                console.log('Correlation found:', correlation);
                toast.warning('Correlation Alert', `${correlation.type}: ${correlation.entities.length} entities`);
            }} onAlert={(alert) => {
                console.log('Alert generated:', alert);
                if (alert.severity === 'high' ||
                    alert.severity === 'critical') {
                    toast.error('Intelligence Alert', `${alert.title}: ${alert.description}`);
                }
                else {
                    toast.info('Intelligence Alert', alert.title);
                }
            }}/>
          </div>
        </div>)}
    </div>);
}
// Wrap with ToastProvider
function HomeRoute() {
    return (<ToastContainer_1.ToastProvider position="top-right" maxToasts={5}>
      <HomeRouteInner />
    </ToastContainer_1.ToastProvider>);
}
exports.default = HomeRoute;
