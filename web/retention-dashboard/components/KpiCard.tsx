'use client';

import React from 'react';

type TargetSummary = {
  type: string;
  identifier: string;
  expired: number;
  deleted: number;
};

type Props = {
  policy: string;
  cutoff: string;
  dryRun: boolean;
  totals: TargetSummary[];
};

export function KpiCard({ policy, cutoff, dryRun, totals }: Props) {
  return (
    <div className="kpi-card">
      <header>
        <h3>{policy}</h3>
        <span className="badge">{dryRun ? 'Dry Run' : 'Enforced'}</span>
      </header>
      <p className="cutoff">Cutoff: {new Date(cutoff).toLocaleString()}</p>
      <div className="targets">
        {totals.map(target => (
          <div key={`${policy}-${target.identifier}`} className="target">
            <p className="target-name">{target.identifier}</p>
            <p className="target-type">{target.type}</p>
            <p className="target-stats">
              Expired: <strong>{target.expired}</strong>
              {' · '}
              Deleted: <strong>{target.deleted}</strong>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
