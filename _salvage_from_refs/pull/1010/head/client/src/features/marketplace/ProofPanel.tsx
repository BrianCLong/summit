import React from 'react';
import ProofBadge from './ProofBadge';

export function ProofPanel({ proofs }: { proofs: string[] }) {
  return (
    <div>
      <h4>Proofs</h4>
      {proofs.map(d => (
        <div key={d}>
          <ProofBadge status="valid" /> {d.slice(0, 8)}
        </div>
      ))}
    </div>
  );
}
