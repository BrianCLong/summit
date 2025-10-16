import React, { useState } from 'react';

interface CostAdvice {
  savedUsd?: number;
}

export default function CostAdvisor() {
  const [yaml, setYaml] = useState('');
  const [res, setRes] = useState<CostAdvice | null>(null);
  async function advise() {
    const r = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ costAdvice(runbookYaml:${JSON.stringify(yaml)}) }`,
      }),
    });
    const j = await r.json();
    setRes(j.data?.costAdvice || null);
  }
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">Cost Advisor</h3>
      <textarea
        className="w-full h-32 border rounded p-2 font-mono"
        value={yaml}
        onChange={(e) => setYaml(e.target.value)}
        placeholder="paste runbook yaml…"
      />
      <button onClick={advise} className="px-3 py-1 rounded-2xl shadow mt-2">
        Advise
      </button>
      <div className="mt-3 text-sm">
        {res ? `Estimated save $${Number(res.savedUsd || 0).toFixed(2)}` : ''}
      </div>
    </div>
  );
}
