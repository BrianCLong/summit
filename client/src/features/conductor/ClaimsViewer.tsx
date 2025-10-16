import React, { useEffect, useState } from 'react';

interface Claim {
  type: string;
  subject: string;
}

interface ClaimSet {
  id: string;
  merkleRoot: string;
  claims: Claim[];
}

export default function ClaimsViewer({ runId }: { runId: string }) {
  const [sets, setSets] = useState<ClaimSet[]>([]);
  useEffect(() => {
    fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ claims(runId:"${runId}"){ id merkleRoot claims{type subject} } }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => setSets(j.data?.claims || []));
  }, [runId]);
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">ClaimSets</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Merkle Root</th>
          </tr>
        </thead>
        <tbody>
          {sets.map((s: ClaimSet) => (
            <tr key={s.id} className="border-b">
              <td className="font-mono">{String(s.id).slice(0, 8)}…</td>
              <td className="font-mono">
                {String(s.merkleRoot || '').slice(0, 12)}…
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
