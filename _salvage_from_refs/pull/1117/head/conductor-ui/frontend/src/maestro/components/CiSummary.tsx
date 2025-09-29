import React from 'react';

export type CiAnnotation = {
  id: string;
  runId: string;
  level: 'notice' | 'warning' | 'failure';
  ts: number;
  repo?: string;
  sha?: string;
  path?: string;
  startLine?: number;
  message: string;
  url?: string;
};

export default function CiSummary({ annotations }: { annotations: CiAnnotation[] }) {
  const by = (lvl: 'notice' | 'warning' | 'failure') =>
    annotations.filter((a) => a.level === lvl).length;
  const repos = new Set(annotations.map((a) => a.repo).filter(Boolean));
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card label="Failures" value={by('failure')} />
      <Card label="Warnings" value={by('warning')} />
      <Card label="Notices" value={by('notice')} />
      <Card label="Repos" value={repos.size} />
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
