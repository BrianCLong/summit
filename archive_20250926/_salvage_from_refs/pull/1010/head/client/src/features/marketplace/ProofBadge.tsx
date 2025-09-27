import React from 'react';

export default function ProofBadge({ status }: { status: 'verifying' | 'valid' | 'invalid' }) {
  if (status === 'verifying') return <span title="verifying">⏳</span>;
  if (status === 'invalid') return <span title="invalid">❌</span>;
  return <span title="valid">✅</span>;
}
