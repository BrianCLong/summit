import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery, useMutation } from '@apollo/client';
import ServerStatus from '../components/ServerStatus';
import AdvancedSearch from '../components/AdvancedSearch';
import GraphPreview from '../components/GraphPreview';
import DataExport from '../components/DataExport';
import InvestigationManager from '../components/InvestigationManager';
import PerformanceMonitor from '../components/PerformanceMonitor';
import HelpSystem, { useHelpSystem } from '../components/HelpSystem';
import {
  useKeyboardShortcuts,
  ShortcutsHelp,
  KeyboardShortcutSettings,
} from '../components/KeyboardShortcuts';
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
import { useAuth } from '../context/AuthContext';
import {
  GET_KEYBOARD_SHORTCUTS,
  SAVE_KEYBOARD_SHORTCUTS,
  RESET_KEYBOARD_SHORTCUTS,
} from '../graphql/keyboardShortcuts.gql';

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
  const { user } = useAuth();

  const shouldLoadShortcuts = !!user?.id;

  const {
    data: keyboardShortcutsData,
    refetch: refetchKeyboardShortcuts,
  } = useQuery(GET_KEYBOARD_SHORTCUTS, {
    skip: !shouldLoadShortcuts,
    fetchPolicy: 'cache-and-network',
  });

  const [saveKeyboardShortcutsMutation, { loading: savingShortcuts }] = useMutation(
    SAVE_KEYBOARD_SHORTCUTS,
  );
  const [resetKeyboardShortcutsMutation, { loading: resettingShortcuts }] = useMutation(
    RESET_KEYBOARD_SHORTCUTS,
  );

  const [showShortcutSettings, setShowShortcutSettings] = useState(false);

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

  type ShortcutBlueprint = {
    actionId: string;
    description: string;
    category: string;
    defaultKeys: string[];
    handler?: () => void;
  };

  type ResolvedShortcut = {
    actionId: string;
    description: string;
    category: string;
    defaultKeys: string[];
    customKeys: string[] | null;
    effectiveKeys: string[];
    updatedAt: string | null;
    handler?: () => void;
  };

  const shortcutBlueprints = useMemo<ShortcutBlueprint[]>(() => {
    const focusSearchInput = () => {
      setActiveTab('search');
      setTimeout(() => {
        const searchInput = document.querySelector(
          'input[placeholder*="Search"]',
        ) as HTMLInputElement | null;
        searchInput?.focus();
      }, 100);
    };

    return [
      {
        actionId: 'nav.overview',
        category: 'Navigation',
        description: 'Go to Overview tab',
        defaultKeys: ['ctrl+1'],
        handler: () => setActiveTab('overview'),
      },
      {
        actionId: 'nav.investigations',
        category: 'Navigation',
        description: 'Go to Investigations tab',
        defaultKeys: ['ctrl+2'],
        handler: () => setActiveTab('investigations'),
      },
      {
        actionId: 'nav.search',
        category: 'Navigation',
        description: 'Go to Search tab',
        defaultKeys: ['ctrl+3'],
        handler: () => setActiveTab('search'),
      },
      {
        actionId: 'nav.export',
        category: 'Navigation',
        description: 'Go to Export tab',
        defaultKeys: ['ctrl+4'],
        handler: () => setActiveTab('export'),
      },
      {
        actionId: 'nav.analytics',
        category: 'Navigation',
        description: 'Go to Analytics tab',
        defaultKeys: ['ctrl+5'],
        handler: () => setActiveTab('analytics'),
      },
      {
        actionId: 'nav.aiAssistant',
        category: 'Navigation',
        description: 'Go to AI Assistant tab',
        defaultKeys: ['ctrl+6'],
        handler: () => setActiveTab('ai-assistant'),
      },
      {
        actionId: 'nav.graphViz',
        category: 'Navigation',
        description: 'Go to Graph Visualization tab',
        defaultKeys: ['ctrl+7'],
        handler: () => setActiveTab('graph-viz'),
      },
      {
        actionId: 'nav.timeline',
        category: 'Navigation',
        description: 'Go to Timeline Analysis tab',
        defaultKeys: ['ctrl+8'],
        handler: () => setActiveTab('timeline'),
      },
      {
        actionId: 'nav.threatIntel',
        category: 'Navigation',
        description: 'Go to Threat Intelligence tab',
        defaultKeys: ['ctrl+9'],
        handler: () => setActiveTab('threat-intel'),
      },
      {
        actionId: 'nav.mlops',
        category: 'Navigation',
        description: 'Go to MLOps tab',
        defaultKeys: ['ctrl+0'],
        handler: () => setActiveTab('mlops'),
      },
      {
        actionId: 'nav.collaboration',
        category: 'Enterprise',
        description: 'Go to Collaboration tab',
        defaultKeys: ['alt+1'],
        handler: () => setActiveTab('collaboration'),
      },
      {
        actionId: 'nav.security',
        category: 'Enterprise',
        description: 'Go to Security tab',
        defaultKeys: ['alt+2'],
        handler: () => setActiveTab('security'),
      },
      {
        actionId: 'nav.monitoring',
        category: 'Enterprise',
        description: 'Go to Monitoring tab',
        defaultKeys: ['alt+3'],
        handler: () => setActiveTab('monitoring'),
      },
      {
        actionId: 'nav.integrations',
        category: 'Enterprise',
        description: 'Go to Integrations tab',
        defaultKeys: ['alt+4'],
        handler: () => setActiveTab('integrations'),
      },
      {
        actionId: 'nav.aiRecommendations',
        category: 'Enterprise',
        description: 'Go to AI Recommendations tab',
        defaultKeys: ['alt+5'],
        handler: () => setActiveTab('ai-recommendations'),
      },
      {
        actionId: 'nav.enterpriseDashboard',
        category: 'Enterprise',
        description: 'Go to Enterprise Dashboard',
        defaultKeys: ['alt+6'],
        handler: () => setActiveTab('enterprise'),
      },
      {
        actionId: 'nav.socialNetwork',
        category: 'Intelligence',
        description: 'Go to Social Network Analysis',
        defaultKeys: ['shift+1'],
        handler: () => setActiveTab('social-network'),
      },
      {
        actionId: 'nav.behavioral',
        category: 'Intelligence',
        description: 'Go to Behavioral Analytics',
        defaultKeys: ['shift+2'],
        handler: () => setActiveTab('behavioral'),
      },
      {
        actionId: 'nav.caseManagement',
        category: 'Intelligence',
        description: 'Go to Case Management',
        defaultKeys: ['shift+3'],
        handler: () => setActiveTab('case-management'),
      },
      {
        actionId: 'nav.threatHunting',
        category: 'Intelligence',
        description: 'Go to Threat Hunting',
        defaultKeys: ['shift+4'],
        handler: () => setActiveTab('threat-hunting'),
      },
      {
        actionId: 'nav.intelFeeds',
        category: 'Intelligence',
        description: 'Go to Intelligence Feeds',
        defaultKeys: ['shift+5'],
        handler: () => setActiveTab('intel-feeds'),
      },
      {
        actionId: 'nav.osintHealth',
        category: 'Enterprise',
        description: 'Open OSINT Health',
        defaultKeys: ['alt+8'],
        handler: () => navigate('/osint/health'),
      },
      {
        actionId: 'nav.cases',
        category: 'Enterprise',
        description: 'Open Cases',
        defaultKeys: ['alt+0'],
        handler: () => navigate('/cases'),
      },
      {
        actionId: 'nav.watchlists',
        category: 'Enterprise',
        description: 'Open Watchlists',
        defaultKeys: ['alt+9'],
        handler: () => navigate('/osint/watchlists'),
      },
      {
        actionId: 'nav.osintStudio',
        category: 'Enterprise',
        description: 'Open OSINT Studio',
        defaultKeys: ['alt+7'],
        handler: () => navigate('/osint'),
      },
      {
        actionId: 'nav.socialNetworkRoute',
        category: 'Intelligence Routes',
        description: 'Open Social Network Intelligence',
        defaultKeys: ['ctrl+shift+1'],
        handler: () => navigate('/intelligence/social-network'),
      },
      {
        actionId: 'nav.behavioralRoute',
        category: 'Intelligence Routes',
        description: 'Open Behavioral Analytics',
        defaultKeys: ['ctrl+shift+2'],
        handler: () => navigate('/intelligence/behavioral'),
      },
      {
        actionId: 'nav.caseManagementRoute',
        category: 'Intelligence Routes',
        description: 'Open Case Management',
        defaultKeys: ['ctrl+shift+3'],
        handler: () => navigate('/intelligence/case-management'),
      },
      {
        actionId: 'nav.threatHuntingRoute',
        category: 'Intelligence Routes',
        description: 'Open Threat Hunting',
        defaultKeys: ['ctrl+shift+4'],
        handler: () => navigate('/intelligence/threat-hunting'),
      },
      {
        actionId: 'nav.intelFeedsRoute',
        category: 'Intelligence Routes',
        description: 'Open Intelligence Feeds',
        defaultKeys: ['ctrl+shift+5'],
        handler: () => navigate('/intelligence/feeds'),
      },
      {
        actionId: 'search.quick',
        category: 'Navigation',
        description: 'Quick search',
        defaultKeys: ['ctrl+k'],
        handler: focusSearchInput,
      },
      {
        actionId: 'help.shortcuts',
        category: 'Help',
        description: 'Show keyboard shortcuts',
        defaultKeys: ['?'],
        handler: () => setShowShortcutsHelp(true),
      },
      {
        actionId: 'help.system',
        category: 'Help',
        description: 'Show help system',
        defaultKeys: ['ctrl+h'],
        handler: () => showHelp(),
      },
      {
        actionId: 'investigation.new',
        category: 'Investigations',
        description: 'New investigation',
        defaultKeys: ['ctrl+n'],
        handler: () => {
          setActiveTab('investigations');
          toast.success('New Investigation', 'Navigate to investigations to create');
        },
      },
    ];
  }, [navigate, setActiveTab, showHelp, toast]);

  const blueprintLookup = useMemo(
    () => new Map(shortcutBlueprints.map((shortcut) => [shortcut.actionId, shortcut])),
    [shortcutBlueprints],
  );

  const keyboardShortcutOverrides = keyboardShortcutsData?.keyboardShortcuts ?? [];

  const resolvedShortcuts = useMemo<ResolvedShortcut[]>(() => {
    const overridesMap = new Map<string, typeof keyboardShortcutOverrides[number]>();
    keyboardShortcutOverrides.forEach((shortcut) => {
      overridesMap.set(shortcut.actionId, shortcut);
    });

    const combined: ResolvedShortcut[] = shortcutBlueprints.map((blueprint) => {
      const override = overridesMap.get(blueprint.actionId);
      const defaultKeys =
        override?.defaultKeys && override.defaultKeys.length > 0
          ? override.defaultKeys
          : blueprint.defaultKeys;
      const effectiveKeys =
        override?.effectiveKeys && override.effectiveKeys.length > 0
          ? override.effectiveKeys
          : defaultKeys;

      return {
        actionId: blueprint.actionId,
        description: override?.description || blueprint.description,
        category: override?.category || blueprint.category,
        defaultKeys,
        customKeys: override?.customKeys ?? null,
        effectiveKeys,
        updatedAt: override?.updatedAt ?? null,
        handler: blueprint.handler,
      };
    });

    overridesMap.forEach((override, actionId) => {
      if (!blueprintLookup.has(actionId)) {
        const defaultKeys = override.defaultKeys ?? [];
        const effectiveKeys =
          override.effectiveKeys && override.effectiveKeys.length > 0
            ? override.effectiveKeys
            : defaultKeys;

        combined.push({
          actionId,
          description: override.description || actionId,
          category: override.category || 'Custom',
          defaultKeys,
          customKeys: override.customKeys ?? null,
          effectiveKeys,
          updatedAt: override.updatedAt ?? null,
          handler: undefined,
        });
      }
    });

    return combined;
  }, [shortcutBlueprints, keyboardShortcutOverrides, blueprintLookup]);

  const registeredShortcuts = useMemo(
    () =>
      resolvedShortcuts
        .filter((shortcut) => shortcut.handler)
        .map((shortcut) => {
          const keys = shortcut.effectiveKeys.length > 0 ? shortcut.effectiveKeys : shortcut.defaultKeys;
          return {
            keys,
            description: shortcut.description,
            action: shortcut.handler as () => void,
            category: shortcut.category,
            actionId: shortcut.actionId,
            customKeys: shortcut.customKeys,
            defaultKeys: shortcut.defaultKeys,
            updatedAt: shortcut.updatedAt,
          };
        })
        .filter((shortcut) => shortcut.keys.length > 0),
    [resolvedShortcuts],
  );

  const helpShortcuts = useMemo(
    () =>
      resolvedShortcuts
        .map((shortcut) => {
          const keys = shortcut.effectiveKeys.length > 0 ? shortcut.effectiveKeys : shortcut.defaultKeys;
          return {
            keys,
            description: shortcut.description,
            action: shortcut.handler ?? (() => {}),
            category: shortcut.category,
            actionId: shortcut.actionId,
            customKeys: shortcut.customKeys,
            defaultKeys: shortcut.defaultKeys,
            updatedAt: shortcut.updatedAt,
          };
        })
        .filter((shortcut) => shortcut.keys.length > 0),
    [resolvedShortcuts],
  );

  const editableShortcuts = useMemo(
    () =>
      resolvedShortcuts.map(({ handler: _handler, ...rest }) => ({
        ...rest,
      })),
    [resolvedShortcuts],
  );

  const handleSaveShortcuts = async (updates: Array<{ actionId: string; keys: string[] }>) => {
    if (!shouldLoadShortcuts) {
      toast.error('Save failed', 'You must be signed in to customize shortcuts.');
      throw new Error('unauthenticated');
    }

    try {
      if (updates.length > 0) {
        await saveKeyboardShortcutsMutation({ variables: { input: updates } });
        toast.success('Shortcuts saved', 'Your keyboard shortcuts were updated.');
      } else {
        toast.success('Shortcuts saved', 'Shortcuts already match their defaults.');
      }
      await refetchKeyboardShortcuts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save shortcuts.';
      toast.error('Save failed', message);
      throw error;
    }
  };

  const handleResetShortcuts = async (actionIds?: string[]) => {
    if (!shouldLoadShortcuts) {
      toast.error('Reset failed', 'You must be signed in to customize shortcuts.');
      throw new Error('unauthenticated');
    }

    try {
      await resetKeyboardShortcutsMutation({ variables: { actionIds } });
      toast.success(
        'Shortcuts reset',
        actionIds && actionIds.length > 0
          ? 'Selected shortcuts have been reset to defaults.'
          : 'All shortcuts have been reset to defaults.',
      );
      await refetchKeyboardShortcuts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset shortcuts.';
      toast.error('Reset failed', message);
      throw error;
    }
  };

  useKeyboardShortcuts(registeredShortcuts);

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
        shortcuts={helpShortcuts}
        isVisible={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        onCustomize={() => {
          setShowShortcutsHelp(false);
          setShowShortcutSettings(true);
        }}
        showCustomize={shouldLoadShortcuts}
      />

      <KeyboardShortcutSettings
        shortcuts={editableShortcuts}
        isOpen={showShortcutSettings}
        onClose={() => setShowShortcutSettings(false)}
        onSave={handleSaveShortcuts}
        onReset={handleResetShortcuts}
        saving={savingShortcuts}
        resetting={resettingShortcuts}
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
              onNodeClick={(node) => console.log('Clicked node:', node)}
            />

            <RealTimePresence
              currentUser={currentUser}
              onUserClick={(user) => console.log('Clicked user:', user)}
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
            onExportComplete={(result) => {
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
                onActionRequest={(action) => {
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
              onNodeSelect={(nodes) => {
                console.log('Selected nodes:', nodes);
                toast.info('Graph Selection', `Selected ${nodes.length} node(s)`);
              }}
              onEdgeSelect={(edges) => {
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
              onEventSelect={(event) => {
                console.log('Selected event:', event);
                toast.info('Timeline Event', `Selected: ${event.title}`);
              }}
              onTimeRangeChange={(start, end) => {
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
              onIndicatorSelect={(indicator) => {
                console.log('Selected threat indicator:', indicator);
                toast.info('Threat Intel', `Selected: ${indicator.type} ${indicator.value}`);
              }}
              onCampaignSelect={(campaign) => {
                console.log('Selected campaign:', campaign);
                toast.info('Campaign', `Selected: ${campaign.name}`);
              }}
              onActorSelect={(actor) => {
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
