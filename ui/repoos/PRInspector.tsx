import React from 'react';
import { Table, type Column } from '../design-system/Table';
import { StatusBadge } from '../design-system/StatusBadge';
import { Panel } from '../design-system/Panel';
import { Button } from '../design-system/Button';
import { SearchBar } from '../design-system/SearchBar';

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  author: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  riskScore: number;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  policyViolations: number;
  createdAt: string;
}

export interface PRInspectorProps {
  pullRequests?: PullRequest[];
  onPRSelect?: (prId: string) => void;
  onSimulateMerge?: (prId: string) => void;
}

export const PRInspector: React.FC<PRInspectorProps> = ({ pullRequests = [], onPRSelect, onSimulateMerge }) => {
  const [search, setSearch] = React.useState('');

  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    open: 'success', merged: 'info', closed: 'neutral', draft: 'warning',
  };

  const columns: Column<PullRequest>[] = [
    { id: 'number', header: '#', accessor: (r) => <span className="font-mono text-fg-secondary">#{r.number}</span>, width: '60px' },
    { id: 'title', header: 'Title', accessor: (r) => <span className="font-medium">{r.title}</span> },
    { id: 'author', header: 'Author', accessor: (r) => r.author },
    { id: 'status', header: 'Status', accessor: (r) => <StatusBadge status={statusMap[r.status]} label={r.status} /> },
    { id: 'risk', header: 'Risk', accessor: (r) => (
      <span className={`font-semibold ${r.riskScore > 70 ? 'text-semantic-error' : r.riskScore > 40 ? 'text-semantic-warning' : 'text-semantic-success'}`}>
        {r.riskScore}
      </span>
    ), align: 'right' },
    { id: 'violations', header: 'Violations', accessor: (r) => (
      r.policyViolations > 0
        ? <StatusBadge status="error" label={`${r.policyViolations}`} />
        : <StatusBadge status="success" label="0" />
    ), align: 'center' },
    { id: 'changes', header: 'Changes', accessor: (r) => (
      <span className="text-xs">
        <span className="text-semantic-success">+{r.linesAdded}</span>
        {' / '}
        <span className="text-semantic-error">-{r.linesRemoved}</span>
      </span>
    ), align: 'right' },
    { id: 'created', header: 'Created', accessor: (r) => r.createdAt },
  ];

  const filteredPRs = search
    ? pullRequests.filter((pr) => pr.title.toLowerCase().includes(search.toLowerCase()) || pr.author.toLowerCase().includes(search.toLowerCase()))
    : pullRequests;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">PR Inspector</h1>
        <Button variant="secondary" size="sm">Export Report</Button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search pull requests..." size="sm" className="max-w-md" />

      <Table
        columns={columns}
        data={filteredPRs}
        keyExtractor={(pr) => pr.id}
        onRowClick={(pr) => onPRSelect?.(pr.id)}
        emptyMessage="No pull requests found"
      />
    </div>
  );
};
