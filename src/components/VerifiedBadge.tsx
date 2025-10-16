import React from 'react';
export default function VerifiedBadge({ version }: { version: string }) {
  return (
    <span className="badge badge--success">Verified against {version}</span>
  );
}
