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
exports.GraphExperiencePanel = GraphExperiencePanel;
const react_1 = __importStar(require("react"));
const ProgressiveGraph_js_1 = require("./ProgressiveGraph.js");
const HAIRBALL_THRESHOLD = 800;
const EDGE_DENSITY_THRESHOLD = 2.2;
const DEFAULT_FEATURES = [
    {
        title: 'Graph Algorithms',
        description: 'Community detection, shortest paths, and influence scoring tuned for IntelGraph datasets.',
        helper: 'Uses battle-tested algorithms and reduces overdraw by batching traversals.',
    },
    {
        title: 'ML Predictions',
        description: 'Predicts missing relationships using AI so analysts can focus on validating signals.',
        helper: 'This predicts missing relationships using AI and calls out low-confidence links before merge.',
    },
    {
        title: 'Narrative Simulation',
        description: 'Turns graph states into explainable storyboards for briefings and handoffs.',
        helper: 'Pairs causal chains with provenance so reviewers can audit every leap.',
    },
];
function formatDensity(nodeCount, edgeCount) {
    if (nodeCount === 0)
        return '0.00';
    return (edgeCount / nodeCount).toFixed(2);
}
function GraphExperiencePanel({ nodeCount, edgeCount, defaultExpandedSections, }) {
    const [advancedOpen, setAdvancedOpen] = (0, react_1.useState)(Boolean(defaultExpandedSections?.advanced));
    const [compactGuardEnabled, setCompactGuardEnabled] = (0, react_1.useState)(nodeCount > HAIRBALL_THRESHOLD);
    const [mobilePreview, setMobilePreview] = (0, react_1.useState)(false);
    const density = (0, react_1.useMemo)(() => formatDensity(nodeCount, edgeCount), [nodeCount, edgeCount]);
    const hairballRisk = (0, react_1.useMemo)(() => {
        const dense = Number.parseFloat(density) >= EDGE_DENSITY_THRESHOLD;
        const large = nodeCount >= HAIRBALL_THRESHOLD;
        const exceedsRenderBudget = nodeCount > ProgressiveGraph_js_1.MAX_VISIBLE_NODES;
        if (exceedsRenderBudget) {
            return 'Scale guard required — rendering budget exceeded. Enable compact and progressive modes.';
        }
        if (large && dense) {
            return 'Hairball risk detected — use compact rendering and filters before analysis.';
        }
        if (large) {
            return 'Large graph detected — keep compact rendering on to avoid UX jank.';
        }
        if (dense) {
            return 'Dense cluster — prefer advanced analysis over raw exploration to avoid noise.';
        }
        return 'Healthy density — full fidelity exploration is safe.';
    }, [density, nodeCount]);
    const layoutHint = (0, react_1.useMemo)(() => {
        if (mobilePreview) {
            return 'Mobile/tablet preview on — cards stack and inputs enlarge for touch targets.';
        }
        return 'Responsive layout auto-adjusts: cards stack below 768px; graph summaries stay touch-friendly.';
    }, [mobilePreview]);
    return (<section aria-label="Graph experience controls" style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            alignItems: 'start',
        }}>
      <article aria-label="Scale readiness" style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            background: '#f8fafc',
        }}>
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            alignItems: 'center',
            marginBottom: 8,
        }}>
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>Scale readiness</p>
            <h3 style={{ margin: 0 }}>Graph size</h3>
          </div>
          <span data-scale-advisory style={{
            padding: '4px 8px',
            borderRadius: 999,
            fontSize: 12,
            background: '#e0f2fe',
            color: '#075985',
        }}>
            {nodeCount} nodes · {edgeCount} edges
          </span>
        </header>
        <dl style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            margin: 0,
        }}>
          <div>
            <dt style={{ color: '#475569', fontSize: 12 }}>Density</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{density}</dd>
          </div>
          <div>
            <dt style={{ color: '#475569', fontSize: 12 }}>Hairball guard</dt>
            <dd style={{ margin: 0 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={compactGuardEnabled} onChange={(event) => setCompactGuardEnabled(event.target.checked)} aria-label="Toggle compact rendering guard" data-compact-guard/>
                Compact rendering
              </label>
            </dd>
          </div>
        </dl>
        <p style={{ marginTop: 12, color: '#0f172a' }}>{hairballRisk}</p>
      </article>

      <article aria-label="Progressive disclosure" style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
        }}>
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
        }}>
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>Progressive disclosure</p>
            <h3 style={{ margin: 0 }}>Advanced analysis</h3>
          </div>
          <button type="button" data-accordion-toggle aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((current) => !current)} style={{
            border: '1px solid #cbd5e1',
            background: '#0f172a',
            color: '#e2e8f0',
            padding: '6px 10px',
            borderRadius: 8,
            cursor: 'pointer',
        }}>
            {advancedOpen ? 'Hide' : 'Show'} advanced
          </button>
        </div>
        {advancedOpen ? (<div data-accordion-panel style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            {DEFAULT_FEATURES.map((feature) => (<div key={feature.title} style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    background: '#f8fafc',
                }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    justifyContent: 'space-between',
                }}>
                  <strong>{feature.title}</strong>
                  <button type="button" title={feature.helper} aria-label={feature.helper} style={{
                    borderRadius: '999px',
                    border: '1px solid #cbd5e1',
                    background: '#e2e8f0',
                    width: 28,
                    height: 28,
                    cursor: 'help',
                }}>
                    ?
                  </button>
                </div>
                <p style={{ margin: '8px 0 0 0' }}>{feature.description}</p>
              </div>))}
          </div>) : (<p style={{ marginTop: 12, color: '#475569' }}>
            Keep the core workflow simple. Reveal advanced graph analysis only when analysts request it.
          </p>)}
      </article>

      <article aria-label="Mobile and tablet UX" style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
        }}>
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
        }}>
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>Mobile & tablet</p>
            <h3 style={{ margin: 0 }}>Responsive safety</h3>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={mobilePreview} onChange={(event) => setMobilePreview(event.target.checked)} aria-label="Toggle mobile preview mode" data-mobile-preview/>
            Preview mobile
          </label>
        </header>
        <p style={{ marginTop: 12, color: '#0f172a' }}>{layoutHint}</p>
        <ul style={{ marginTop: 8, paddingLeft: 20, color: '#0f172a' }}>
          <li>Action buttons stay touch-sized with 44px hit areas.</li>
          <li>Graph overlays avoid fixed widths and respect system font scaling.</li>
          <li>Legends and tooltips stay anchored within the viewport.</li>
        </ul>
      </article>
    </section>);
}
