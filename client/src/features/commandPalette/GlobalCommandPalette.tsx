import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CommandPalette from './CommandPalette';
import { registerCommand } from './commandRegistry';

type GlobalCommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Registers every discoverable surface in Summit as a command.
 * Categories: Navigate | Actions | Intelligence | AI & Automation | Workspace | Admin
 *
 * Accessed globally via ⌘K / Ctrl+K.
 */
function useRegisterAllCommands() {
  const navigate = useNavigate();

  useEffect(() => {
    const dispose = [
      // ── Navigate ─────────────────────────────────────────────────────────
      registerCommand({
        id: 'nav-dashboard',
        title: 'Go to Dashboard',
        description: 'Command center overview with live platform metrics',
        category: 'Navigate',
        keywords: ['home', 'overview', 'metrics', 'command center', 'main'],
        action: () => navigate('/dashboard'),
      }),
      registerCommand({
        id: 'nav-search',
        title: 'Go to Search',
        description: 'Full-text entity and document search across all data',
        category: 'Navigate',
        keywords: ['find', 'query', 'lookup', 'search', 'discover'],
        action: () => navigate('/search'),
      }),
      registerCommand({
        id: 'nav-graph',
        title: 'Open IntelGraph',
        description: 'Interactive entity-relationship graph explorer',
        category: 'Navigate',
        keywords: ['graph', 'entities', 'relationships', 'network', 'nodes', 'links', 'intelfraph'],
        action: () => navigate('/graph'),
      }),
      registerCommand({
        id: 'nav-investigations',
        title: 'Go to Investigations',
        description: 'Browse and manage active investigation workspaces',
        category: 'Navigate',
        keywords: ['cases', 'investigation', 'workspace', 'dossier', 'case'],
        action: () => navigate('/investigations'),
      }),
      registerCommand({
        id: 'nav-hunts',
        title: 'Go to Threat Hunts',
        description: 'Proactive threat hunting campaigns and results',
        category: 'Navigate',
        keywords: ['hunt', 'threat', 'campaign', 'hunting', 'proactive'],
        action: () => navigate('/hunts'),
      }),
      registerCommand({
        id: 'nav-ioc',
        title: 'Go to Indicators',
        description: 'Indicators of Compromise (IOC) management and enrichment',
        category: 'Navigate',
        keywords: ['ioc', 'indicator', 'compromise', 'threat intel', 'fingerprint'],
        action: () => navigate('/ioc'),
      }),
      registerCommand({
        id: 'nav-link-analysis',
        title: 'Open Link Analysis',
        description: 'Visualize entity connections and trace relationship paths',
        category: 'Navigate',
        keywords: ['link', 'analysis', 'connections', 'path', 'canvas', 'visualization'],
        action: () => navigate('/link-analysis'),
      }),
      registerCommand({
        id: 'nav-geoint',
        title: 'Open GeoInt Map',
        description: 'Geospatial intelligence — location-based entity analysis',
        category: 'Navigate',
        keywords: ['map', 'geo', 'geoint', 'location', 'geospatial', 'geography'],
        action: () => navigate('/geoint'),
      }),

      // ── Actions ───────────────────────────────────────────────────────────
      registerCommand({
        id: 'action-new-investigation',
        title: 'New Investigation',
        description: 'Create a new investigation workspace',
        category: 'Actions',
        keywords: ['create', 'new', 'investigation', 'case', 'start', 'open'],
        action: () => navigate('/investigations/new'),
      }),

      // ── Intelligence ──────────────────────────────────────────────────────
      registerCommand({
        id: 'nav-threats',
        title: 'Threat Analysis',
        description: 'AI-powered threat assessment with MITRE ATT&CK mapping',
        category: 'Intelligence',
        keywords: ['threat', 'mitre', 'attack', 'risk', 'vulnerability', 'cve', 'assessment'],
        action: () => navigate('/threats'),
      }),
      registerCommand({
        id: 'nav-osint',
        title: 'OSINT Studio',
        description: 'Open-source intelligence scanning and collection',
        category: 'Intelligence',
        keywords: ['osint', 'scan', 'open source', 'intel', 'reconnaissance', 'collection'],
        action: () => navigate('/osint'),
      }),
      registerCommand({
        id: 'nav-access-intel',
        title: 'Access Intel',
        description: 'Role-based access intelligence and permissions map',
        category: 'Intelligence',
        keywords: ['access', 'rbac', 'permissions', 'roles', 'intel', 'authorization'],
        action: () => navigate('/access-intel'),
      }),
      registerCommand({
        id: 'nav-disclosures',
        title: 'Disclosures',
        description: 'GDPR / privacy data subject access request management',
        category: 'Intelligence',
        keywords: ['disclosure', 'dsar', 'gdpr', 'privacy', 'export', 'data subject', 'compliance'],
        action: () => navigate('/disclosures'),
      }),

      // ── AI & Automation ───────────────────────────────────────────────────
      registerCommand({
        id: 'nav-copilot',
        title: 'AI Copilot',
        description: 'Intelligent investigation assistant and AI analysis partner',
        category: 'AI & Automation',
        keywords: ['ai', 'copilot', 'assistant', 'nlp', 'intelligence', 'chat'],
        action: () => navigate('/copilot'),
      }),
      registerCommand({
        id: 'nav-orchestrator',
        title: 'Orchestrator',
        description: 'Automated workflow and mission orchestration engine',
        category: 'AI & Automation',
        keywords: ['orchestrator', 'mission', 'workflow', 'automation', 'pipeline', 'launch'],
        action: () => navigate('/orchestrator'),
      }),
      registerCommand({
        id: 'nav-maestro',
        title: 'Maestro Pipelines',
        description: 'Advanced pipeline orchestration and run monitoring with traces',
        category: 'AI & Automation',
        keywords: ['maestro', 'pipeline', 'runs', 'execution', 'trace', 'otel'],
        action: () => navigate('/maestro'),
      }),
      registerCommand({
        id: 'nav-workflows',
        title: 'Workflow Editor',
        description: 'Build and execute visual intelligence workflows',
        category: 'AI & Automation',
        keywords: ['workflow', 'flow', 'pipeline', 'automation', 'builder', 'visual'],
        action: () => navigate('/workflows'),
      }),
      registerCommand({
        id: 'nav-approvals',
        title: 'Approvals Queue',
        description: 'Review and approve pending operator actions and AI decisions',
        category: 'AI & Automation',
        keywords: ['approval', 'approve', 'review', 'decision', 'authorize', 'queue'],
        action: () => navigate('/approvals'),
      }),

      // ── Workspace ─────────────────────────────────────────────────────────
      registerCommand({
        id: 'nav-briefstudio',
        title: 'Brief Studio',
        description: 'Compose structured intelligence briefs with citations and exhibits',
        category: 'Workspace',
        keywords: ['brief', 'report', 'document', 'compose', 'export', 'write', 'publish'],
        action: () => navigate('/briefstudio'),
      }),
      registerCommand({
        id: 'nav-watchlists',
        title: 'Watchlists',
        description: 'Monitor entities and indicators via named watchlists',
        category: 'Workspace',
        keywords: ['watchlist', 'monitor', 'watch', 'track', 'alert', 'observe'],
        action: () => navigate('/watchlists'),
      }),
      registerCommand({
        id: 'nav-reports',
        title: 'Reports',
        description: 'Generated intelligence reports, exports, and history',
        category: 'Workspace',
        keywords: ['report', 'export', 'generate', 'pdf', 'summary', 'intelligence report'],
        action: () => navigate('/reports'),
      }),

      // ── Admin ─────────────────────────────────────────────────────────────
      registerCommand({
        id: 'nav-system',
        title: 'System Settings',
        description: 'Platform config, model providers, budget caps, and admin controls',
        category: 'Admin',
        keywords: ['admin', 'settings', 'system', 'config', 'budget', 'model', 'provider'],
        action: () => navigate('/system'),
      }),
      registerCommand({
        id: 'nav-security',
        title: 'Security Center',
        description: 'Platform security settings, audit logs, and key management',
        category: 'Admin',
        keywords: ['security', 'audit', 'keys', 'credentials', 'policy', 'hardening'],
        action: () => navigate('/security'),
      }),
      registerCommand({
        id: 'nav-compliance',
        title: 'Compliance Center',
        description: 'Regulatory compliance, data governance, and audit trails',
        category: 'Admin',
        keywords: ['compliance', 'governance', 'audit', 'regulatory', 'dsar', 'gdpr'],
        action: () => navigate('/compliance'),
      }),
      registerCommand({
        id: 'nav-alerting',
        title: 'Alerting Config',
        description: 'Configure platform alerts, thresholds, and notification rules',
        category: 'Admin',
        keywords: ['alert', 'notification', 'threshold', 'rule', 'monitor', 'pagerduty'],
        action: () => navigate('/alerting'),
      }),
      registerCommand({
        id: 'nav-integrations',
        title: 'Integrations',
        description: 'Connect external data sources and third-party services',
        category: 'Admin',
        keywords: ['integration', 'connector', 'api', 'webhook', 'external', 'data source'],
        action: () => navigate('/integrations'),
      }),
      registerCommand({
        id: 'nav-plugins',
        title: 'Plugins',
        description: 'Manage installed platform extensions and capabilities',
        category: 'Admin',
        keywords: ['plugin', 'extension', 'module', 'add-on', 'install', 'marketplace'],
        action: () => navigate('/plugins'),
      }),
      registerCommand({
        id: 'nav-partner-console',
        title: 'Partner Console',
        description: 'Multi-tenant partner management and billing overview',
        category: 'Admin',
        keywords: ['partner', 'tenant', 'billing', 'console', 'multi-tenant', 'reseller'],
        action: () => navigate('/partner-console'),
      }),
      registerCommand({
        id: 'nav-osint-feeds',
        title: 'OSINT Feed Config',
        description: 'Configure open-source intelligence feed sources and schedules',
        category: 'Admin',
        keywords: ['osint', 'feeds', 'source', 'intel feed', 'rss', 'schedule'],
        action: () => navigate('/admin/osint-feeds'),
      }),
      registerCommand({
        id: 'nav-sandbox',
        title: 'Sandbox',
        description: 'Safe environment for testing queries, prompts, and integrations',
        category: 'Admin',
        keywords: ['sandbox', 'test', 'playground', 'debug', 'experiment', 'trial'],
        action: () => navigate('/sandbox'),
      }),
    ];

    return () => dispose.forEach((unregister) => unregister());
  }, [navigate]);
}

export function GlobalCommandPalette({ open, onClose }: GlobalCommandPaletteProps) {
  useRegisterAllCommands();
  return <CommandPalette open={open} onClose={onClose} />;
}

export default GlobalCommandPalette;
