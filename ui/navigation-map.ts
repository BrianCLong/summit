/**
 * Summit UI Navigation Architecture
 *
 * Maps all platform capabilities to a unified navigation structure.
 * Each section corresponds to discovered capabilities in capability-registry.json.
 */

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: NavigationItem[];
  capabilityIds?: string[];
  requiredRole: Role;
  badge?: 'new' | 'beta' | 'alert';
}

export type Role = 'viewer' | 'analyst' | 'operator' | 'admin';

export const navigationMap: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/',
    requiredRole: 'viewer',
    capabilityIds: ['operations-telemetry', 'operations-cost-ledger'],
    children: [
      { id: 'dashboard-overview', label: 'Overview', icon: 'Activity', path: '/dashboard', requiredRole: 'viewer' },
      { id: 'dashboard-alerts', label: 'Alerts', icon: 'Bell', path: '/dashboard/alerts', requiredRole: 'viewer' },
      { id: 'dashboard-metrics', label: 'Metrics', icon: 'BarChart3', path: '/dashboard/metrics', requiredRole: 'viewer' },
    ],
  },
  {
    id: 'investigations',
    label: 'Investigations',
    icon: 'Search',
    path: '/investigations',
    requiredRole: 'analyst',
    capabilityIds: ['investigation-workspace'],
    children: [
      { id: 'investigations-active', label: 'Active', icon: 'FolderOpen', path: '/investigations/active', requiredRole: 'analyst' },
      { id: 'investigations-archive', label: 'Archive', icon: 'Archive', path: '/investigations/archive', requiredRole: 'analyst' },
      { id: 'investigations-templates', label: 'Templates', icon: 'FileTemplate', path: '/investigations/templates', requiredRole: 'analyst' },
    ],
  },
  {
    id: 'intelgraph',
    label: 'IntelGraph',
    icon: 'Network',
    path: '/intelgraph',
    requiredRole: 'viewer',
    capabilityIds: [
      'intelgraph-exploration',
      'intelgraph-pattern-mining',
      'intelgraph-entity-search',
      'intelgraph-relationship-analysis',
      'intelgraph-timeline',
      'vtii-index',
      'graphrag-query',
    ],
    children: [
      { id: 'intelgraph-workspace', label: 'Graph Workspace', icon: 'GitBranch', path: '/intelgraph/workspace', requiredRole: 'viewer' },
      { id: 'intelgraph-search', label: 'Entity Search', icon: 'Search', path: '/intelgraph/search', requiredRole: 'viewer' },
      { id: 'intelgraph-patterns', label: 'Pattern Mining', icon: 'Sparkles', path: '/intelgraph/patterns', requiredRole: 'analyst' },
      { id: 'intelgraph-timeline', label: 'Timeline', icon: 'Clock', path: '/intelgraph/timeline', requiredRole: 'viewer' },
      { id: 'intelgraph-graphrag', label: 'GraphRAG Query', icon: 'MessageSquare', path: '/intelgraph/graphrag', requiredRole: 'analyst', badge: 'beta' },
    ],
  },
  {
    id: 'repositories',
    label: 'Repositories',
    icon: 'GitBranch',
    path: '/repositories',
    requiredRole: 'viewer',
    capabilityIds: [
      'repoos-dashboard',
      'repoos-pr-analytics',
      'repoos-dependency-impact',
      'repoos-policy-engine',
      'repoos-entropy-monitor',
      'repoos-batch-optimizer',
      'repoos-risk-forecasting',
    ],
    children: [
      { id: 'repos-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/repositories/dashboard', requiredRole: 'viewer' },
      { id: 'repos-prs', label: 'PR Inspector', icon: 'GitPullRequest', path: '/repositories/prs', requiredRole: 'analyst' },
      { id: 'repos-dependencies', label: 'Dependencies', icon: 'Layers', path: '/repositories/dependencies', requiredRole: 'analyst' },
      { id: 'repos-policies', label: 'Policies', icon: 'Shield', path: '/repositories/policies', requiredRole: 'operator' },
      { id: 'repos-entropy', label: 'Entropy Monitor', icon: 'Thermometer', path: '/repositories/entropy', requiredRole: 'analyst' },
      { id: 'repos-batch', label: 'Batch Optimizer', icon: 'Zap', path: '/repositories/batch', requiredRole: 'operator' },
    ],
  },
  {
    id: 'architecture',
    label: 'Architecture Intelligence',
    icon: 'Building2',
    path: '/architecture',
    requiredRole: 'analyst',
    capabilityIds: [
      'evolution-ledger',
      'architecture-discovery',
      'innovation-discovery',
      'technology-radar',
      'driftlens',
      'cascade-detection',
    ],
    children: [
      { id: 'arch-evolution', label: 'Evolution Ledger', icon: 'ScrollText', path: '/architecture/evolution', requiredRole: 'analyst' },
      { id: 'arch-timeline', label: 'Architecture Timeline', icon: 'Clock', path: '/architecture/timeline', requiredRole: 'analyst' },
      { id: 'arch-innovation', label: 'Innovation Discovery', icon: 'Lightbulb', path: '/architecture/innovation', requiredRole: 'analyst' },
      { id: 'arch-radar', label: 'Technology Radar', icon: 'Radar', path: '/architecture/radar', requiredRole: 'analyst' },
      { id: 'arch-drift', label: 'DriftLens', icon: 'Eye', path: '/architecture/drift', requiredRole: 'analyst', badge: 'new' },
      { id: 'arch-cascade', label: 'Cascade Detection', icon: 'AlertTriangle', path: '/architecture/cascade', requiredRole: 'operator' },
    ],
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: 'Bot',
    path: '/agents',
    requiredRole: 'operator',
    capabilityIds: ['agent-dashboard', 'agent-benchmarks', 'agent-trajectory-inspector', 'agent-evaluation', 'sandbox-agents'],
    children: [
      { id: 'agents-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/agents/dashboard', requiredRole: 'operator' },
      { id: 'agents-benchmarks', label: 'Benchmarks', icon: 'BarChart3', path: '/agents/benchmarks', requiredRole: 'analyst' },
      { id: 'agents-trajectories', label: 'Trajectory Inspector', icon: 'Route', path: '/agents/trajectories', requiredRole: 'analyst' },
      { id: 'agents-evaluation', label: 'Evaluation Results', icon: 'CheckCircle', path: '/agents/evaluation', requiredRole: 'analyst' },
      { id: 'agents-sandbox', label: 'Sandbox', icon: 'Box', path: '/agents/sandbox', requiredRole: 'operator' },
    ],
  },
  {
    id: 'simulations',
    label: 'Simulations',
    icon: 'FlaskConical',
    path: '/simulations',
    requiredRole: 'analyst',
    capabilityIds: ['simulation-scenario-builder', 'simulation-runner', 'simulation-outcomes', 'simulation-trajectory', 'cwmi-index'],
    children: [
      { id: 'sim-builder', label: 'Scenario Builder', icon: 'Puzzle', path: '/simulations/builder', requiredRole: 'analyst' },
      { id: 'sim-runner', label: 'Runner', icon: 'Play', path: '/simulations/runner', requiredRole: 'operator' },
      { id: 'sim-outcomes', label: 'Outcome Explorer', icon: 'TreeDeciduous', path: '/simulations/outcomes', requiredRole: 'analyst' },
      { id: 'sim-trajectories', label: 'Trajectories', icon: 'TrendingUp', path: '/simulations/trajectories', requiredRole: 'analyst' },
      { id: 'sim-world-model', label: 'World Model', icon: 'Globe', path: '/simulations/world-model', requiredRole: 'analyst', badge: 'beta' },
    ],
  },
  {
    id: 'threat',
    label: 'Threat Intelligence',
    icon: 'ShieldAlert',
    path: '/threat',
    requiredRole: 'analyst',
    capabilityIds: ['threat-actor-graph', 'threat-indicators', 'threat-campaigns', 'threat-risk-model'],
    children: [
      { id: 'threat-graph', label: 'Threat Graph', icon: 'Network', path: '/threat/graph', requiredRole: 'analyst' },
      { id: 'threat-indicators', label: 'Indicators', icon: 'Crosshair', path: '/threat/indicators', requiredRole: 'analyst' },
      { id: 'threat-campaigns', label: 'Campaigns', icon: 'Flag', path: '/threat/campaigns', requiredRole: 'analyst' },
      { id: 'threat-risk', label: 'Risk Models', icon: 'Gauge', path: '/threat/risk', requiredRole: 'analyst' },
    ],
  },
  {
    id: 'datasources',
    label: 'Data Sources',
    icon: 'Database',
    path: '/data',
    requiredRole: 'analyst',
    capabilityIds: ['osint-aggregator', 'datasets-management'],
    children: [
      { id: 'data-osint', label: 'OSINT', icon: 'Globe', path: '/data/osint', requiredRole: 'analyst' },
      { id: 'data-datasets', label: 'Datasets', icon: 'Table', path: '/data/datasets', requiredRole: 'analyst' },
      { id: 'data-connectors', label: 'Connectors', icon: 'Plug', path: '/data/connectors', requiredRole: 'operator' },
      { id: 'data-ingest', label: 'Ingest', icon: 'Upload', path: '/data/ingest', requiredRole: 'operator' },
    ],
  },
  {
    id: 'experiments',
    label: 'Experiments',
    icon: 'TestTube',
    path: '/experiments',
    requiredRole: 'analyst',
    capabilityIds: ['experiment-tracking'],
    children: [
      { id: 'exp-runs', label: 'Runs', icon: 'Play', path: '/experiments/runs', requiredRole: 'analyst' },
      { id: 'exp-compare', label: 'Compare', icon: 'Columns', path: '/experiments/compare', requiredRole: 'analyst' },
      { id: 'exp-artifacts', label: 'Artifacts', icon: 'Package', path: '/experiments/artifacts', requiredRole: 'analyst' },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: 'Scale',
    path: '/governance',
    requiredRole: 'operator',
    capabilityIds: ['governance-policies', 'governance-compliance', 'regulatory-early-warning'],
    children: [
      { id: 'gov-policies', label: 'Policies', icon: 'FileText', path: '/governance/policies', requiredRole: 'operator' },
      { id: 'gov-compliance', label: 'Compliance', icon: 'CheckSquare', path: '/governance/compliance', requiredRole: 'operator' },
      { id: 'gov-regulatory', label: 'Regulatory Warnings', icon: 'AlertOctagon', path: '/governance/regulatory', requiredRole: 'operator' },
      { id: 'gov-audit', label: 'Audit Trail', icon: 'ScrollText', path: '/governance/audit', requiredRole: 'admin' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'Settings2',
    path: '/operations',
    requiredRole: 'operator',
    capabilityIds: ['operations-cost-ledger', 'operations-telemetry', 'operations-ci-analytics', 'playbook-orchestration'],
    children: [
      { id: 'ops-telemetry', label: 'Telemetry', icon: 'Activity', path: '/operations/telemetry', requiredRole: 'operator' },
      { id: 'ops-costs', label: 'Cost Ledger', icon: 'DollarSign', path: '/operations/costs', requiredRole: 'operator' },
      { id: 'ops-ci', label: 'CI/CD Analytics', icon: 'GitMerge', path: '/operations/ci', requiredRole: 'operator' },
      { id: 'ops-playbooks', label: 'Playbooks', icon: 'BookOpen', path: '/operations/playbooks', requiredRole: 'operator' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    path: '/settings',
    requiredRole: 'admin',
    capabilityIds: ['settings-platform'],
    children: [
      { id: 'settings-general', label: 'General', icon: 'Sliders', path: '/settings/general', requiredRole: 'admin' },
      { id: 'settings-users', label: 'Users & Roles', icon: 'Users', path: '/settings/users', requiredRole: 'admin' },
      { id: 'settings-integrations', label: 'Integrations', icon: 'Plug', path: '/settings/integrations', requiredRole: 'admin' },
      { id: 'settings-api', label: 'API Keys', icon: 'Key', path: '/settings/api', requiredRole: 'admin' },
    ],
  },
];

/**
 * Flat lookup for quick capability → navigation resolution
 */
export function getNavigationForCapability(capabilityId: string): NavigationItem | undefined {
  for (const section of navigationMap) {
    if (section.capabilityIds?.includes(capabilityId)) return section;
    for (const child of section.children ?? []) {
      if (child.capabilityIds?.includes(capabilityId)) return child;
    }
  }
  return undefined;
}

/**
 * Filter navigation by user role
 */
export function getNavigationForRole(role: Role): NavigationItem[] {
  const roleHierarchy: Record<Role, number> = { viewer: 0, analyst: 1, operator: 2, admin: 3 };
  const userLevel = roleHierarchy[role];

  return navigationMap
    .filter((item) => roleHierarchy[item.requiredRole] <= userLevel)
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => roleHierarchy[child.requiredRole] <= userLevel),
    }));
}
