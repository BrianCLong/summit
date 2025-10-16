import React, { useState } from 'react';

interface LintIssue {
  rule: string;
  severity: 'error' | 'warning';
  path: string;
  message: string;
  quickFix?: string;
}

interface PolicySimulation {
  stepId: string;
  decision: string;
  reason: string;
}

export default function CopilotAuthoring() {
  const [spec, setSpec] = useState('');
  const [yaml, setYaml] = useState('');
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [sim, setSim] = useState<PolicySimulation[]>([]);
  async function gen() {
    const r = await fetch('/pipelines/copilot/suggest', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: spec,
    });
    setYaml(await r.text());
  }
  async function runLint() {
    const r = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ lintRunbook(yaml:${JSON.stringify(yaml)}){rule severity path message quickFix}}`,
      }),
    });
    const j = await r.json();
    setIssues(j.data?.lintRunbook || []);
  }
  async function runSim() {
    const r = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ simulatePolicy(yaml:${JSON.stringify(yaml)}){stepId decision reason}}`,
      }),
    });
    const j = await r.json();
    setSim(j.data?.simulatePolicy || []);
  }
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <div>
        <h3 className="text-lg font-semibold">Spec</h3>
        <textarea
          className="w-full h-48 border rounded p-2"
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          placeholder="paste your intent/spec…"
        />
        <div className="mt-2 flex gap-2">
          <button onClick={gen} className="px-3 py-1 rounded-2xl shadow">
            Generate DSL
          </button>
          <button onClick={runLint} className="px-3 py-1 rounded-2xl shadow">
            Lint
          </button>
          <button onClick={runSim} className="px-3 py-1 rounded-2xl shadow">
            Simulate
          </button>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold">DSL v5</h3>
        <textarea
          className="w-full h-48 border rounded p-2 font-mono"
          value={yaml}
          onChange={(e) => setYaml(e.target.value)}
        />
        <h4 className="font-semibold mt-3">Issues</h4>
        <ul className="text-sm">
          {issues.map((it: LintIssue, i: number) => (
            <li
              key={i}
              className={`p-1 ${it.severity === 'error' ? 'text-red-600' : 'text-yellow-700'}`}
            >
              {it.rule} • {it.path} — {it.message}{' '}
              {it.quickFix ? `(fix: ${it.quickFix})` : ''}
            </li>
          ))}
        </ul>
        <h4 className="font-semibold mt-3">Policy Simulation</h4>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Step</th>
              <th>Decision</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {sim.map((s: PolicySimulation, i: number) => (
              <tr key={i} className="border-b">
                <td>{s.stepId}</td>
                <td>{s.decision}</td>
                <td>{s.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
