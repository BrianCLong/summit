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
exports.LineageDashboard = LineageDashboard;
const react_1 = __importStar(require("react"));
function formatTimestamp(timestamp) {
    if (!timestamp)
        return 'unknown';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime()))
        return timestamp;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}
function provenanceSummary(provenance) {
    if (!provenance)
        return 'unverified';
    return [
        provenance.source,
        provenance.ingress,
        provenance.traceId ? `trace ${provenance.traceId}` : undefined,
        `hash ${provenance.checksum.slice(0, 8)}`,
    ]
        .filter(Boolean)
        .join(' · ');
}
function LineageDashboard({ nodes, edges, lineage }) {
    const annotatedNodes = (0, react_1.useMemo)(() => nodes.filter((node) => Boolean(node.provenance)), [nodes]);
    const recentNodes = (0, react_1.useMemo)(() => {
        return [...annotatedNodes]
            .sort((a, b) => (b.provenance?.observedAt ?? '').localeCompare(a.provenance?.observedAt ?? ''))
            .slice(0, 6);
    }, [annotatedNodes]);
    const edgeCoverage = (0, react_1.useMemo)(() => edges.filter((edge) => Boolean(edge.provenance)).length, [edges]);
    const missingNodes = lineage?.missingNodes ?? nodes.filter((node) => !node.provenance).map((node) => node.id);
    const missingEdges = lineage?.missingEdges ?? edges.filter((edge) => !edge.provenance).map((edge) => edge.id);
    return (<div style={{ display: 'grid', gap: '16px' }}>
      <section style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            background: '#f8fafc',
        }} aria-label="Lineage Coverage">
        <h3 style={{ margin: '0 0 8px 0' }}>Lineage Coverage</h3>
        <p style={{ margin: 0 }}>
          Nodes with provenance: {lineage?.nodesWithProvenance ?? annotatedNodes.length} / {nodes.length}
        </p>
        <p style={{ margin: 0 }}>
          Edges with provenance: {lineage?.edgesWithProvenance ?? edgeCoverage} / {edges.length}
        </p>
        {missingNodes.length > 0 || missingEdges.length > 0 ? (<div style={{ marginTop: 8 }}>
            <strong>Gaps detected:</strong>
            <ul>
              {missingNodes.map((id) => (<li key={`missing-node-${id}`}>missing {id}</li>))}
              {missingEdges.map((id) => (<li key={`missing-edge-${id}`}>missing edge {id}</li>))}
            </ul>
          </div>) : (<p style={{ marginTop: 8 }}>All graph elements include provenance.</p>)}
      </section>

      <section style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
        }} aria-label="Recent Provenance">
        <h3 style={{ margin: '0 0 8px 0' }}>Recent Provenance</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>Node</th>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>Observed</th>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {recentNodes.map((node) => (<tr key={node.id}>
                <td style={{ padding: '4px 8px' }}>{node.id}</td>
                <td style={{ padding: '4px 8px' }}>
                  {formatTimestamp(node.provenance?.observedAt)}
                </td>
                <td style={{ padding: '4px 8px' }}>{provenanceSummary(node.provenance)}</td>
              </tr>))}
          </tbody>
        </table>
      </section>
    </div>);
}
