import React from 'react';
import { MetricCard } from '../design-system/MetricCard';
import { Panel } from '../design-system/Panel';
import { StatusBadge } from '../design-system/StatusBadge';
import { Tabs } from '../design-system/Tabs';

export interface RepoMetrics {
  totalPRs: number;
  openPRs: number;
  mergedToday: number;
  riskScore: number;
  entropy: number;
  policyCompliance: number;
  buildPassRate: number;
  avgMergeTime: string;
}

export interface RepoDashboardProps {
  metrics?: RepoMetrics;
  repositories?: Array<{ id: string; name: string; status: 'healthy' | 'warning' | 'critical'; lastActivity: string }>;
  onRepoSelect?: (repoId: string) => void;
}

export const RepoDashboard: React.FC<RepoDashboardProps> = ({ metrics, repositories = [], onRepoSelect }) => {
  const [activeTab, setActiveTab] = React.useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'health', label: 'Health' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'trends', label: 'Trends' },
  ];

  const statusMap = { healthy: 'success' as const, warning: 'warning' as const, critical: 'error' as const };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Repository Governance</h1>
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="pill" size="sm" />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Open PRs" value={metrics?.openPRs ?? '-'} status="info" change={{ value: -12, period: '7d' }} trend="down" />
        <MetricCard label="Risk Score" value={metrics?.riskScore ?? '-'} status={metrics && metrics.riskScore > 70 ? 'error' : metrics && metrics.riskScore > 40 ? 'warning' : 'success'} />
        <MetricCard label="Entropy" value={metrics?.entropy?.toFixed(2) ?? '-'} status="neutral" change={{ value: 3, period: '7d' }} trend="up" />
        <MetricCard label="Policy Compliance" value={metrics ? `${metrics.policyCompliance}%` : '-'} status={metrics && metrics.policyCompliance >= 95 ? 'success' : 'warning'} />
        <MetricCard label="Build Pass Rate" value={metrics ? `${metrics.buildPassRate}%` : '-'} status={metrics && metrics.buildPassRate >= 95 ? 'success' : 'warning'} />
        <MetricCard label="Merged Today" value={metrics?.mergedToday ?? '-'} status="neutral" />
        <MetricCard label="Total PRs" value={metrics?.totalPRs ?? '-'} status="neutral" />
        <MetricCard label="Avg Merge Time" value={metrics?.avgMergeTime ?? '-'} status="neutral" />
      </div>

      {/* Repository list */}
      <Panel title="Repositories" subtitle={`${repositories.length} tracked repositories`}>
        <div className="space-y-2">
          {repositories.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onRepoSelect?.(repo.id)}
              className="w-full flex items-center justify-between p-3 bg-bg-primary rounded-lg border border-border-muted hover:border-brand-primary/30 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-fg-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-sm font-medium text-fg-primary">{repo.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-fg-tertiary">{repo.lastActivity}</span>
                <StatusBadge status={statusMap[repo.status]} label={repo.status} />
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
};
