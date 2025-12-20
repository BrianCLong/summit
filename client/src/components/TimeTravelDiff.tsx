import React, { useState } from 'react';

interface DiffRow {
  stepId: string;
  type: 'artifact' | 'metric' | 'log' | 'duration';
  before: unknown;
  after: unknown;
  severity: 'info' | 'warn' | 'error';
}

export default function TimeTravelDiff() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [rows, setRows] = useState<DiffRow[]>([]);
  async function run() {
    const r = await fetch(`/api/replay/diff?a=${a}&b=${b}`);
    setRows(await r.json());
  }
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <input
          className="border rounded px-2 py-1"
          placeholder="run A id"
          onChange={(e) => setA(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="run B id"
          onChange={(e) => setB(e.target.value)}
        />
        <button onClick={run} className="px-3 py-1 rounded-2xl shadow">
          Diff
        </button>
        <input
          id="f"
          className="border rounded px-2 py-1 ml-auto"
          placeholder="filter…"
        />
      </div>
      <ul className="text-sm">
        {rows.map((d: DiffRow, i: number) => (
          <li
            key={i}
            className={`border-b py-1 ${d.severity != 'info' ? 'bg-yellow-50' : ''}`}
          >
            {d.stepId} • {d.type} • {d.severity}
          </li>
        ))}
      </ul>
    </div>
  );
}
