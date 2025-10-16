import React, { useEffect, useState } from 'react';
import $ from 'jquery';
export default function ProvenanceViewer({ tag }: { tag: string }) {
  const [chain, setChain] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/api/provenance/${tag}`)
      .then((r) => r.json())
      .then(setChain);
  }, [tag]);
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold mb-2">Provenance — {tag}</h3>
      <ul className="text-sm">
        {chain.map((c, i) => (
          <li
            key={i}
            className={`border-b py-1 ${c.ok ? 'text-green-700' : 'text-red-600'}`}
          >
            {c.stage} — {c.ok ? 'OK' : 'FAIL'}
          </li>
        ))}
      </ul>
    </div>
  );
}
