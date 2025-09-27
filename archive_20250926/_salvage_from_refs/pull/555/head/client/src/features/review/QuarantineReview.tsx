import React from 'react';

interface Item {
  id: string;
  tenantId: string;
}

const items: Item[] = [];

export const QuarantineReview: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const filtered = items.filter(i => i.tenantId === tenantId);
  return (
    <div>
      <h2>Quarantine Review</h2>
      <ul>
        {filtered.map(i => (
          <li key={i.id}>{i.id} <span className="badge">{i.tenantId}</span></li>
        ))}
      </ul>
    </div>
  );
};
