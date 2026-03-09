import React from 'react';
import { MetricCard } from '../design-system/MetricCard';
import { StatusBadge } from '../design-system/StatusBadge';
import { Table, type Column } from '../design-system/Table';
import { Tabs } from '../design-system/Tabs';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'error' | 'stopped';
  taskCount: number;
  successRate: number;
  avgLatency: string;
  memoryUsage: number;
  lastActive: string;
}

export interface AgentDashboardProps {
  agents?: Agent[];
  onAgentSelect?: (agentId: string) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ agents = [], onAgentSelect }) => {
  const [filter, setFilter] = React.useState('all');

  const tabs = [
    { id: 'all', label: 'All', badge: agents.length },
    { id: 'active', label: 'Active', badge: agents.filter((a) => a.status === 'active').length },
    { id: 'idle', label: 'Idle', badge: agents.filter((a) => a.status === 'idle').length },
    { id: 'error', label: 'Error', badge: agents.filter((a) => a.status === 'error').length },
  ];

  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success', idle: 'neutral', error: 'error', stopped: 'warning',
  };

  const filteredAgents = filter === 'all' ? agents : agents.filter((a) => a.status === filter);

  const columns: Column<Agent>[] = [
    { id: 'name', header: 'Agent', accessor: (a) => (
      <div>
        <span className="font-medium text-fg-primary">{a.name}</span>
        <span className="ml-2 text-2xs text-fg-tertiary">{a.type}</span>
      </div>
    )},
    { id: 'status', header: 'Status', accessor: (a) => <StatusBadge status={statusMap[a.status]} label={a.status} /> },
    { id: 'tasks', header: 'Tasks', accessor: (a) => a.taskCount, align: 'right' },
    { id: 'success', header: 'Success Rate', accessor: (a) => (
      <span className={a.successRate >= 95 ? 'text-semantic-success' : a.successRate >= 80 ? 'text-semantic-warning' : 'text-semantic-error'}>
        {a.successRate.toFixed(1)}%
      </span>
    ), align: 'right' },
    { id: 'latency', header: 'Avg Latency', accessor: (a) => a.avgLatency, align: 'right' },
    { id: 'memory', header: 'Memory', accessor: (a) => (
      <div className="flex items-center gap-2">
        <div className="w-12 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary rounded-full" style={{ width: `${a.memoryUsage}%` }} />
        </div>
        <span className="text-xs text-fg-tertiary">{a.memoryUsage}%</span>
      </div>
    )},
    { id: 'last', header: 'Last Active', accessor: (a) => a.lastActive },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Agent Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Agents" value={agents.length} status="neutral" />
        <MetricCard label="Active" value={agents.filter((a) => a.status === 'active').length} status="success" />
        <MetricCard label="Avg Success Rate" value={agents.length > 0 ? `${(agents.reduce((a, ag) => a + ag.successRate, 0) / agents.length).toFixed(1)}%` : '-'} status="info" />
        <MetricCard label="Errors" value={agents.filter((a) => a.status === 'error').length} status="error" />
      </div>

      <Tabs tabs={tabs} activeTab={filter} onTabChange={setFilter} variant="pill" size="sm" />
      <Table columns={columns} data={filteredAgents} keyExtractor={(a) => a.id} onRowClick={(a) => onAgentSelect?.(a.id)} />
    </div>
  );
};
