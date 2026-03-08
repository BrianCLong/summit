"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CopilotAuthoring;
const react_1 = __importStar(require("react"));
function CopilotAuthoring() {
    const [spec, setSpec] = (0, react_1.useState)('');
    const [yaml, setYaml] = (0, react_1.useState)('');
    const [issues, setIssues] = (0, react_1.useState)([]);
    const [sim, setSim] = (0, react_1.useState)([]);
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
    return (<div className="grid grid-cols-2 gap-4 p-4">
      <div>
        <h3 className="text-lg font-semibold">Spec</h3>
        <textarea className="w-full h-48 border rounded p-2" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="paste your intent/spec…"/>
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
        <textarea className="w-full h-48 border rounded p-2 font-mono" value={yaml} onChange={(e) => setYaml(e.target.value)}/>
        <h4 className="font-semibold mt-3">Issues</h4>
        <ul className="text-sm">
          {issues.map((it, i) => (<li key={i} className={`p-1 ${it.severity === 'error' ? 'text-red-600' : 'text-yellow-700'}`}>
              {it.rule} • {it.path} — {it.message}{' '}
              {it.quickFix ? `(fix: ${it.quickFix})` : ''}
            </li>))}
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
            {sim.map((s, i) => (<tr key={i} className="border-b">
                <td>{s.stepId}</td>
                <td>{s.decision}</td>
                <td>{s.reason}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
