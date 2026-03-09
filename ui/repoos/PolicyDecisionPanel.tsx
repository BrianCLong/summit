import React from 'react';
import { Panel } from '../design-system/Panel';
import { Table, type Column } from '../design-system/Table';
import { StatusBadge } from '../design-system/StatusBadge';
import { Button } from '../design-system/Button';
import { Tabs } from '../design-system/Tabs';

export interface PolicyDecision {
  id: string;
  policyName: string;
  resource: string;
  decision: 'allow' | 'deny' | 'warn';
  reason: string;
  timestamp: string;
  evaluator: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  type: 'opa' | 'custom' | 'governance';
  status: 'active' | 'draft' | 'disabled';
  lastTriggered: string;
  triggerCount: number;
}

export interface PolicyDecisionPanelProps {
  decisions?: PolicyDecision[];
  rules?: PolicyRule[];
  onDecisionSelect?: (decisionId: string) => void;
  onRuleEdit?: (ruleId: string) => void;
}

export const PolicyDecisionPanel: React.FC<PolicyDecisionPanelProps> = ({ decisions = [], rules = [], onDecisionSelect, onRuleEdit }) => {
  const [activeTab, setActiveTab] = React.useState('decisions');

  const tabs = [
    { id: 'decisions', label: 'Decisions', badge: decisions.length },
    { id: 'rules', label: 'Policy Rules', badge: rules.length },
  ];

  const decisionColumns: Column<PolicyDecision>[] = [
    { id: 'decision', header: 'Decision', accessor: (d) => (
      <StatusBadge status={d.decision === 'allow' ? 'success' : d.decision === 'deny' ? 'error' : 'warning'} label={d.decision} />
    )},
    { id: 'policy', header: 'Policy', accessor: (d) => <span className="font-medium">{d.policyName}</span> },
    { id: 'resource', header: 'Resource', accessor: (d) => <span className="font-mono text-xs">{d.resource}</span> },
    { id: 'reason', header: 'Reason', accessor: (d) => <span className="text-xs text-fg-secondary">{d.reason}</span> },
    { id: 'evaluator', header: 'Evaluator', accessor: (d) => d.evaluator },
    { id: 'timestamp', header: 'Time', accessor: (d) => d.timestamp },
  ];

  const ruleColumns: Column<PolicyRule>[] = [
    { id: 'name', header: 'Rule', accessor: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'type', header: 'Type', accessor: (r) => <StatusBadge status="neutral" label={r.type} dot={false} /> },
    { id: 'status', header: 'Status', accessor: (r) => (
      <StatusBadge status={r.status === 'active' ? 'success' : r.status === 'draft' ? 'warning' : 'neutral'} label={r.status} />
    )},
    { id: 'triggers', header: 'Triggers', accessor: (r) => r.triggerCount, align: 'right' },
    { id: 'lastTriggered', header: 'Last Triggered', accessor: (r) => r.lastTriggered },
    { id: 'actions', header: '', accessor: (r) => (
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRuleEdit?.(r.id); }}>Edit</Button>
    )},
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Policy Engine</h1>
        <Button size="sm">Create Rule</Button>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="underline" />

      {activeTab === 'decisions' && (
        <Table columns={decisionColumns} data={decisions} keyExtractor={(d) => d.id} onRowClick={(d) => onDecisionSelect?.(d.id)} />
      )}
      {activeTab === 'rules' && (
        <Table columns={ruleColumns} data={rules} keyExtractor={(r) => r.id} />
      )}
    </div>
  );
};
