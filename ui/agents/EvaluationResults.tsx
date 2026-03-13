import React from 'react';
import { Table, type Column } from '../design-system/Table';
import { MetricCard } from '../design-system/MetricCard';
import { StatusBadge } from '../design-system/StatusBadge';
import { Panel } from '../design-system/Panel';

export interface EvaluationRun {
  id: string;
  evaluationName: string;
  agentName: string;
  score: number;
  maxScore: number;
  passedCases: number;
  totalCases: number;
  errors: string[];
  duration: string;
  runDate: string;
}

export interface EvaluationResultsProps {
  evaluations?: EvaluationRun[];
  onEvaluationSelect?: (evalId: string) => void;
}

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({ evaluations = [], onEvaluationSelect }) => {
  const columns: Column<EvaluationRun>[] = [
    { id: 'evaluation', header: 'Evaluation', accessor: (e) => <span className="font-medium">{e.evaluationName}</span> },
    { id: 'agent', header: 'Agent', accessor: (e) => e.agentName },
    { id: 'score', header: 'Score', accessor: (e) => (
      <span className="font-semibold">{e.score}/{e.maxScore}</span>
    ), align: 'right' },
    { id: 'pass', header: 'Pass Rate', accessor: (e) => {
      const rate = e.totalCases > 0 ? (e.passedCases / e.totalCases) * 100 : 0;
      return (
        <span className={rate >= 90 ? 'text-semantic-success' : rate >= 70 ? 'text-semantic-warning' : 'text-semantic-error'}>
          {e.passedCases}/{e.totalCases} ({rate.toFixed(0)}%)
        </span>
      );
    }, align: 'right' },
    { id: 'errors', header: 'Errors', accessor: (e) => (
      e.errors.length > 0
        ? <StatusBadge status="error" label={`${e.errors.length} errors`} />
        : <StatusBadge status="success" label="Clean" />
    )},
    { id: 'duration', header: 'Duration', accessor: (e) => e.duration },
    { id: 'date', header: 'Date', accessor: (e) => e.runDate },
  ];

  const avgScore = evaluations.length > 0
    ? evaluations.reduce((a, e) => a + (e.score / e.maxScore), 0) / evaluations.length
    : 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Evaluation Results</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Evaluations" value={evaluations.length} status="neutral" />
        <MetricCard label="Avg Score" value={`${(avgScore * 100).toFixed(1)}%`} status={avgScore >= 0.9 ? 'success' : avgScore >= 0.7 ? 'warning' : 'error'} />
        <MetricCard label="Perfect Scores" value={evaluations.filter((e) => e.score === e.maxScore).length} status="success" />
        <MetricCard label="With Errors" value={evaluations.filter((e) => e.errors.length > 0).length} status="error" />
      </div>

      <Table columns={columns} data={evaluations} keyExtractor={(e) => e.id} onRowClick={(e) => onEvaluationSelect?.(e.id)} />
    </div>
  );
};
