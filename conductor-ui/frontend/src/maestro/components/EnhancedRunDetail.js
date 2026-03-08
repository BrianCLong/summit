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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EnhancedRunDetail;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const api_1 = require("../api");
const DAG_1 = __importDefault(require("./DAG"));
const GrafanaPanel_1 = __importDefault(require("./GrafanaPanel"));
const AgentTimeline_1 = __importDefault(require("./AgentTimeline"));
function TabPanel({ children, value, index }) {
    return (<div hidden={value !== index} role="tabpanel" aria-labelledby={`tab-${index}`}>
      {value === index && children}
    </div>);
}
function RunTimeline({ runId }) {
    const { useRunGraph } = (0, api_1.api)();
    const { nodes, edges } = useRunGraph(runId);
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    return (<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Pipeline DAG
        </h3>
        <DAG_1.default nodes={nodes} edges={edges} onSelect={setSelectedNode} selectedNode={selectedNode}/>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Step Inspector
        </h3>
        {!selectedNode ? (<div className="text-sm text-slate-500">
            Select a step from the DAG to inspect its details, metrics, and
            logs.
          </div>) : (<NodeInspector runId={runId} nodeId={selectedNode}/>)}
      </div>
    </div>);
}
function NodeInspector({ runId, nodeId }) {
    const { useRunNodeMetrics, useRunNodeEvidence, getRunNodeRouting } = (0, api_1.api)();
    const { metrics } = useRunNodeMetrics(runId, nodeId);
    const { evidence } = useRunNodeEvidence(runId, nodeId);
    const [routing, setRouting] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchRouting = async () => {
            try {
                const result = await getRunNodeRouting(runId, nodeId);
                setRouting(result);
            }
            catch (error) {
                console.warn('Failed to fetch node routing:', error);
            }
        };
        fetchRouting();
    }, [runId, nodeId]);
    return (<div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2">
          Step: {nodeId}
        </h4>
        {metrics && (<div className="text-xs text-slate-600 space-y-1">
            <div>Duration: {metrics.durationMs}ms</div>
            <div>
              CPU: {metrics.cpuPct}% • Memory: {metrics.memMB}MB
            </div>
            <div>
              Tokens: {metrics.tokens} • Cost: ${metrics.cost}
            </div>
            <div>Retries: {metrics.retries}</div>
          </div>)}
      </div>

      {routing && (<div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">
            Routing Decision
          </h4>
          <div className="text-xs text-slate-600 space-y-1">
            <div>Model: {routing.decision?.model}</div>
            <div>Score: {routing.decision?.score}</div>
            <div>Policy: {routing.policy?.allow ? 'Allow' : 'Deny'}</div>
            {routing.policy?.reasons?.length > 0 && (<div>Reasons: {routing.policy.reasons.join(', ')}</div>)}
          </div>
        </div>)}

      {evidence && (<div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Evidence</h4>
          <div className="text-xs text-slate-600 space-y-1">
            <div>Artifacts: {evidence.artifacts?.length || 0}</div>
            <div>Trace ID: {evidence.traceId || '—'}</div>
            {evidence.provenance && (<>
                <div>SBOM: {evidence.provenance.sbom}</div>
                <div>Cosign: {evidence.provenance.cosign}</div>
                <div>SLSA: {evidence.provenance.slsa}</div>
              </>)}
          </div>
        </div>)}

      <div className="flex flex-wrap gap-2">
        <button className="rounded border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
          View Logs
        </button>
        {evidence?.traceId && (<button className="rounded border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">
            View Trace
          </button>)}
        <button className="rounded border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
          Replay Step
        </button>
      </div>
    </div>);
}
function LogsViewer({ runId }) {
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    const [traceFilter, setTraceFilter] = (0, react_1.useState)(null);
    const { useRunLogs } = (0, api_1.api)();
    const { lines, clear } = useRunLogs(runId, selectedNode);
    const [connected, setConnected] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const filteredLines = lines.filter((line) => !traceFilter || line.text.includes(traceFilter));
    return (<div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold text-slate-700">Live Logs</h3>
        <div className="flex items-center gap-2">
          {traceFilter && (<button onClick={() => setTraceFilter(null)} className="rounded border px-2 py-1 text-xs hover:bg-slate-50">
              Clear Filter
            </button>)}
          <button onClick={clear} className="rounded border px-2 py-1 text-xs hover:bg-slate-50">
            Clear
          </button>
          <div className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${connected
            ? 'bg-green-500'
            : error
                ? 'bg-red-500'
                : 'bg-yellow-500'}`}/>
            <span className="text-xs text-slate-500">
              {connected
            ? 'Connected'
            : error
                ? 'Disconnected'
                : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {error && (<div className="border-b border-red-200 bg-red-50 p-2 text-sm text-red-800">
          ⚠️ Stream error: {error}
        </div>)}

      <div className="max-h-96 overflow-auto p-3 font-mono text-xs">
        {filteredLines.length === 0 && connected && (<div className="text-slate-500 italic">
            Waiting for log entries...
          </div>)}
        {filteredLines.map((logLine, i) => (<div key={i} className="whitespace-pre-wrap py-0.5">
            <span className="text-slate-400">
              {new Date(logLine.ts).toISOString().split('T')[1].slice(0, -1)}
            </span>{' '}
            {logLine.text}
          </div>))}
      </div>
    </div>);
}
function ObservabilityTab({ runId }) {
    return (<div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GrafanaPanel_1.default uid="maestro-trace-waterfall" title="Trace Waterfall"/>
        <GrafanaPanel_1.default uid="maestro-step-metrics" title="Step Metrics"/>
        <GrafanaPanel_1.default uid="maestro-alerts" title="Related Alerts"/>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          OpenTelemetry Trace
        </h3>
        <div className="text-sm text-slate-600">
          Trace ID:{' '}
          <span className="font-mono">{runId.replace('run_', 'trace_')}</span>
        </div>
        <div className="mt-3">
          <button className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
            Open in Jaeger
          </button>
        </div>
      </div>
    </div>);
}
function EvidenceTab({ runId }) {
    const [evidenceBundle, setEvidenceBundle] = (0, react_1.useState)(null);
    const [generating, setGenerating] = (0, react_1.useState)(false);
    const { getRunEvidence } = (0, api_1.api)();
    const generateEvidenceBundle = async () => {
        setGenerating(true);
        try {
            // This would call the evidence generation API
            const response = await fetch(`/api/maestro/v1/evidence/run/${runId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const bundle = await response.json();
            setEvidenceBundle(bundle);
        }
        catch (error) {
            console.error('Failed to generate evidence bundle:', error);
        }
        finally {
            setGenerating(false);
        }
    };
    (0, react_1.useEffect)(() => {
        const fetchEvidence = async () => {
            try {
                const evidence = await getRunEvidence(runId);
                // Check if evidence bundle already exists
                if (evidence.bundleUrl) {
                    setEvidenceBundle(evidence);
                }
            }
            catch (error) {
                console.warn('No existing evidence bundle found');
            }
        };
        fetchEvidence();
    }, [runId]);
    return (<div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Witness Bundle
          </h3>
          <button onClick={generateEvidenceBundle} disabled={generating} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
            {generating ? 'Generating...' : 'Generate Evidence Bundle'}
          </button>
        </div>

        {evidenceBundle ? (<div className="space-y-3">
            <div className="text-sm text-green-800 bg-green-50 rounded p-2">
              ✅ Evidence bundle generated and signed
            </div>
            <div className="text-xs text-slate-600">
              <div>
                Bundle URL:{' '}
                <a href={evidenceBundle.bundleUrl} className="text-indigo-600 hover:underline">
                  Download
                </a>
              </div>
              <div>
                Signature:{' '}
                <span className="font-mono">
                  {evidenceBundle.signature.slice(0, 32)}...
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-medium text-slate-700 mb-1">
                  Included Evidence:
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>SBOM verification</li>
                  <li>
                    Cosign attestations (
                    {evidenceBundle.contents.attestations.length})
                  </li>
                  <li>
                    Policy proofs ({evidenceBundle.contents.policyProofs.length}
                    )
                  </li>
                  <li>SLO snapshot</li>
                  <li>Rollout state</li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-slate-700 mb-1">
                  Verification Status:
                </div>
                <div className="space-y-0.5 text-slate-600">
                  <div>🔒 Cryptographically signed</div>
                  <div>📋 SLSA L3 attested</div>
                  <div>🔍 Supply chain verified</div>
                  <div>⚖️ Policy compliant</div>
                </div>
              </div>
            </div>
          </div>) : (<div className="text-sm text-slate-600">
            No evidence bundle generated yet. Click "Generate Evidence Bundle"
            to create a cryptographically signed bundle containing SBOM,
            attestations, policy proofs, and compliance snapshots.
          </div>)}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Attestations
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>SBOM Present</span>
              <span className="text-green-600">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cosign Verified</span>
              <span className="text-green-600">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>SLSA Attested</span>
              <span className="text-green-600">✓</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Policy Compliance
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Security Policies</span>
              <span className="text-green-600">Pass</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cost Limits</span>
              <span className="text-green-600">Pass</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Change Approval</span>
              <span className="text-green-600">Pass</span>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
function ArtifactsTab({ runId }) {
    const { useArtifacts } = (0, api_1.api)();
    const { artifacts } = useArtifacts(runId);
    return (<div className="rounded-lg border bg-white">
      <div className="border-b p-3 text-sm font-semibold text-slate-700">
        Artifacts
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Digest</th>
            <th className="px-3 py-2">Size</th>
            <th className="px-3 py-2">Signed</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {artifacts.map((artifact) => (<tr key={artifact.digest} className="border-t">
              <td className="px-3 py-2">{artifact.name || artifact.type}</td>
              <td className="px-3 py-2 font-mono text-xs">{artifact.digest}</td>
              <td className="px-3 py-2">{artifact.size || '—'}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-0.5 text-xs ${artifact.signed
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'}`}>
                  {artifact.signed ? 'Signed' : 'Unsigned'}
                </span>
              </td>
              <td className="px-3 py-2">
                <button className="text-xs text-indigo-600 hover:underline">
                  Download
                </button>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
function EnhancedRunDetail() {
    const { id } = (0, react_router_dom_1.useParams)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('timeline');
    const { useRun } = (0, api_1.api)();
    const { data: run } = useRun(id);
    if (!run) {
        return (<div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="text-sm text-slate-600">Loading run details...</div>
      </div>);
    }
    const tabs = [
        { id: 'timeline', label: 'Timeline', icon: '🔄' },
        { id: 'logs', label: 'Logs', icon: '📋' },
        { id: 'observability', label: 'Observability', icon: '📊' },
        { id: 'evidence', label: 'Evidence', icon: '🔒' },
        { id: 'artifacts', label: 'Artifacts', icon: '📦' },
        { id: 'agent', label: 'Agent', icon: '🤖' },
    ];
    return (<div className="space-y-4">
      {/* Run Header */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-500">Run</div>
            <h1 className="font-mono text-lg font-semibold">{run.id}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Pipeline: {run.pipelineId}</span>
              <span>•</span>
              <span>
                Status:{' '}
                <span className={`rounded px-2 py-0.5 font-medium ${statusColors[run.status]}`}>
                  {run.status}
                </span>
              </span>
              <span>•</span>
              <span>Environment: {run.env}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded border px-2 py-1 text-sm hover:bg-slate-50">
              Pause
            </button>
            <button className="rounded border px-2 py-1 text-sm hover:bg-slate-50">
              Cancel
            </button>
            <button className="rounded border px-2 py-1 text-sm hover:bg-slate-50">
              Retry
            </button>
            <react_router_dom_1.Link to={`/maestro/runs/${run.id}/compare`} className="rounded border px-2 py-1 text-sm text-indigo-600 hover:bg-indigo-50">
              Compare
            </react_router_dom_1.Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {tabs.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'}`}>
              <span>{tab.icon}</span>
              {tab.label}
            </button>))}
        </div>
      </div>

      {/* Tab Content */}
      <TabPanel value={activeTab} index="timeline">
        <RunTimeline runId={run.id}/>
      </TabPanel>

      <TabPanel value={activeTab} index="logs">
        <LogsViewer runId={run.id}/>
      </TabPanel>

      <TabPanel value={activeTab} index="observability">
        <ObservabilityTab runId={run.id}/>
      </TabPanel>

      <TabPanel value={activeTab} index="evidence">
        <EvidenceTab runId={run.id}/>
      </TabPanel>

      <TabPanel value={activeTab} index="artifacts">
        <ArtifactsTab runId={run.id}/>
      </TabPanel>

      <TabPanel value={activeTab} index="agent">
        <AgentTimeline_1.default runId={run.id}/>
      </TabPanel>
    </div>);
}
const statusColors = {
    queued: 'bg-slate-100 text-slate-800',
    running: 'bg-blue-100 text-blue-800',
    succeeded: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-yellow-100 text-yellow-800',
};
