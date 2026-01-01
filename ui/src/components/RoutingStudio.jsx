import React, { useState } from 'react';

const Card = ({ title, children, actions, className = '' }) => (
  <div className={`glass-card rounded-xl shadow-lg bg-white ${className}`} role="region" aria-labelledby={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}>
    <div className="flex items-center justify-between p-4 border-b border-gray-100">
      <h3 id={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-lg font-semibold text-gray-900">
        {title}
      </h3>
      {actions && (
        <div className="flex items-center space-x-2">{actions}</div>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const RoutingStudio = () => {
  const [task, setTask] = useState('nl2cypher');
  const [loa, setLoa] = useState('1');
  const [tenant, setTenant] = useState('default');
  const [costCap, setCostCap] = useState('$0.00');
  const [routeDecision, setRouteDecision] = useState(null);
  const [promptPreview, setPromptPreview] = useState(
    '[system] You are Orion…\n[user] Graph schema: … → produce Cypher',
  );
  const [runInEnclave, setRunInEnclave] = useState(true);

  const attestationProof = routeDecision?.attestationProof || 'PCR:trusted-measurement | Quote: sha256:enclave-sample';

  const runDryRun = async () => {
    // Simulate API call
    setRouteDecision({ model: 'local/llama', confidence: 0.82 });
  };

  const executeNow = async () => {
    // Simulate execution
    console.log('Execution with:', { task, loa, tenant, costCap, runInEnclave, promptPreview });
  };

  return (
    <div className="space-y-6">
      {/* Task Configuration */}
      <Card
        title="Routing Studio"
        actions={
          <div className="flex space-x-2">
            <button
              onClick={runDryRun}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              [Run Dry-Run]
            </button>
            <button
              onClick={executeNow}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              [Execute Now]
            </button>
          </div>
        }
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 p-3 rounded-lg border border-dashed border-green-400 bg-green-50">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 font-semibold text-green-800">
              <input
                type="checkbox"
                checked={runInEnclave}
                onChange={(e) => setRunInEnclave(e.target.checked)}
                className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
              />
              <span>Run in Enclave</span>
            </label>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              ✅ Attested
            </span>
          </div>
          <div className="text-xs text-gray-600">
            {runInEnclave
              ? 'Ingress only, sealed storage enforced, KMS unwrap inside enclave.'
              : 'Enclave protections disabled; job will run in standard runtime.'}
          </div>
        </div>
        <div className="mb-4">
          <h4 className="font-semibold mb-3">Task Meta</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task:
              </label>
              <select
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>nl2cypher</option>
                <option>rag</option>
                <option>coding</option>
                <option>general</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LOA:
              </label>
              <select
                value={loa}
                onChange={(e) => setLoa(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>1</option>
                <option>2</option>
                <option>3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant:
              </label>
              <select
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>default</option>
                <option>prod</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Cap:
              </label>
              <input
                type="text"
                value={costCap}
                onChange={(e) => setCostCap(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Rule Preview and Prompt Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Rule Preview">
          <div className="space-y-2 font-mono text-sm">
            <div>when env=prod → hosted:off</div>
            <div>when task=nl2cypher → model…</div>
            <div className="text-gray-500">
              // Dynamic rules based on policy
            </div>
          </div>
        </Card>

        <Card title="Prompt Preview">
          <textarea
            value={promptPreview}
            onChange={(e) => setPromptPreview(e.target.value)}
            className="w-full h-32 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Card>
      </div>

      {/* Model Decision */}
      <Card title="Model Candidates & Decision">
        <div className="space-y-4">
          <div>
            <strong>Model Candidates:</strong> local/llama (p50 90ms),
            …/cpu (p50 180ms), openrouter/…
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <strong>Decision:</strong>{' '}
              {routeDecision?.model || 'local/llama'}
            </div>
            <div>
              <strong>Confidence:</strong> 0.82
            </div>
            <button className="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
              [Explain]
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RoutingStudio;