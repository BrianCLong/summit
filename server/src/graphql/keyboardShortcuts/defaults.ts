export interface KeyboardShortcutDefinition {
  actionId: string;
  category: string;
  description: string;
  defaultKeys: string[];
}

export const KEYBOARD_SHORTCUT_DEFAULTS: KeyboardShortcutDefinition[] = [
  { actionId: 'nav.overview', category: 'Navigation', description: 'Go to Overview tab', defaultKeys: ['ctrl+1'] },
  { actionId: 'nav.investigations', category: 'Navigation', description: 'Go to Investigations tab', defaultKeys: ['ctrl+2'] },
  { actionId: 'nav.search', category: 'Navigation', description: 'Go to Search tab', defaultKeys: ['ctrl+3'] },
  { actionId: 'nav.export', category: 'Navigation', description: 'Go to Export tab', defaultKeys: ['ctrl+4'] },
  { actionId: 'nav.analytics', category: 'Navigation', description: 'Go to Analytics tab', defaultKeys: ['ctrl+5'] },
  { actionId: 'nav.aiAssistant', category: 'Navigation', description: 'Go to AI Assistant tab', defaultKeys: ['ctrl+6'] },
  { actionId: 'nav.graphViz', category: 'Navigation', description: 'Go to Graph Visualization tab', defaultKeys: ['ctrl+7'] },
  { actionId: 'nav.timeline', category: 'Navigation', description: 'Go to Timeline Analysis tab', defaultKeys: ['ctrl+8'] },
  { actionId: 'nav.threatIntel', category: 'Navigation', description: 'Go to Threat Intelligence tab', defaultKeys: ['ctrl+9'] },
  { actionId: 'nav.mlops', category: 'Navigation', description: 'Go to MLOps tab', defaultKeys: ['ctrl+0'] },
  { actionId: 'nav.collaboration', category: 'Enterprise', description: 'Go to Collaboration tab', defaultKeys: ['alt+1'] },
  { actionId: 'nav.security', category: 'Enterprise', description: 'Go to Security tab', defaultKeys: ['alt+2'] },
  { actionId: 'nav.monitoring', category: 'Enterprise', description: 'Go to Monitoring tab', defaultKeys: ['alt+3'] },
  { actionId: 'nav.integrations', category: 'Enterprise', description: 'Go to Integrations tab', defaultKeys: ['alt+4'] },
  { actionId: 'nav.aiRecommendations', category: 'Enterprise', description: 'Go to AI Recommendations tab', defaultKeys: ['alt+5'] },
  { actionId: 'nav.enterpriseDashboard', category: 'Enterprise', description: 'Go to Enterprise Dashboard', defaultKeys: ['alt+6'] },
  { actionId: 'nav.socialNetwork', category: 'Intelligence', description: 'Go to Social Network Analysis', defaultKeys: ['shift+1'] },
  { actionId: 'nav.behavioral', category: 'Intelligence', description: 'Go to Behavioral Analytics', defaultKeys: ['shift+2'] },
  { actionId: 'nav.caseManagement', category: 'Intelligence', description: 'Go to Case Management', defaultKeys: ['shift+3'] },
  { actionId: 'nav.threatHunting', category: 'Intelligence', description: 'Go to Threat Hunting', defaultKeys: ['shift+4'] },
  { actionId: 'nav.intelFeeds', category: 'Intelligence', description: 'Go to Intelligence Feeds', defaultKeys: ['shift+5'] },
  { actionId: 'nav.osintHealth', category: 'Enterprise', description: 'Open OSINT Health', defaultKeys: ['alt+8'] },
  { actionId: 'nav.cases', category: 'Enterprise', description: 'Open Cases', defaultKeys: ['alt+0'] },
  { actionId: 'nav.watchlists', category: 'Enterprise', description: 'Open Watchlists', defaultKeys: ['alt+9'] },
  { actionId: 'nav.osintStudio', category: 'Enterprise', description: 'Open OSINT Studio', defaultKeys: ['alt+7'] },
  {
    actionId: 'nav.socialNetworkRoute',
    category: 'Intelligence Routes',
    description: 'Open Social Network Intelligence',
    defaultKeys: ['ctrl+shift+1'],
  },
  {
    actionId: 'nav.behavioralRoute',
    category: 'Intelligence Routes',
    description: 'Open Behavioral Analytics',
    defaultKeys: ['ctrl+shift+2'],
  },
  {
    actionId: 'nav.caseManagementRoute',
    category: 'Intelligence Routes',
    description: 'Open Case Management',
    defaultKeys: ['ctrl+shift+3'],
  },
  {
    actionId: 'nav.threatHuntingRoute',
    category: 'Intelligence Routes',
    description: 'Open Threat Hunting',
    defaultKeys: ['ctrl+shift+4'],
  },
  {
    actionId: 'nav.intelFeedsRoute',
    category: 'Intelligence Routes',
    description: 'Open Intelligence Feeds',
    defaultKeys: ['ctrl+shift+5'],
  },
  {
    actionId: 'search.quick',
    category: 'Navigation',
    description: 'Quick search',
    defaultKeys: ['ctrl+k'],
  },
  {
    actionId: 'help.shortcuts',
    category: 'Help',
    description: 'Show keyboard shortcuts',
    defaultKeys: ['?'],
  },
  {
    actionId: 'help.system',
    category: 'Help',
    description: 'Show help system',
    defaultKeys: ['ctrl+h'],
  },
  {
    actionId: 'investigation.new',
    category: 'Investigations',
    description: 'New investigation',
    defaultKeys: ['ctrl+n'],
  },
];

export const DEFAULT_SHORTCUT_MAP = new Map(
  KEYBOARD_SHORTCUT_DEFAULTS.map((shortcut) => [shortcut.actionId, shortcut]),
);
