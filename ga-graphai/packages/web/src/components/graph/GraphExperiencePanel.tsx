import React, { useMemo, useState } from 'react';
import { MAX_VISIBLE_NODES } from './ProgressiveGraph.js';

export interface GraphExperiencePanelProps {
  nodeCount: number;
  edgeCount: number;
  defaultExpandedSections?: {
    advanced?: boolean;
  };
}

const HAIRBALL_THRESHOLD = 800;
const EDGE_DENSITY_THRESHOLD = 2.2;

interface AdvancedFeature {
  title: string;
  description: string;
  helper: string;
}

const DEFAULT_FEATURES: AdvancedFeature[] = [
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

function formatDensity(nodeCount: number, edgeCount: number): string {
  if (nodeCount === 0) return '0.00';
  return (edgeCount / nodeCount).toFixed(2);
}

export function GraphExperiencePanel({
  nodeCount,
  edgeCount,
  defaultExpandedSections,
}: GraphExperiencePanelProps): JSX.Element {
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(defaultExpandedSections?.advanced),
  );
  const [compactGuardEnabled, setCompactGuardEnabled] = useState(
    nodeCount > HAIRBALL_THRESHOLD,
  );
  const [mobilePreview, setMobilePreview] = useState(false);

  const density = useMemo(
    () => formatDensity(nodeCount, edgeCount),
    [nodeCount, edgeCount],
  );

  const hairballRisk = useMemo(() => {
    const dense = Number.parseFloat(density) >= EDGE_DENSITY_THRESHOLD;
    const large = nodeCount >= HAIRBALL_THRESHOLD;
    const exceedsRenderBudget = nodeCount > MAX_VISIBLE_NODES;

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

  const layoutHint = useMemo(() => {
    if (mobilePreview) {
      return 'Mobile/tablet preview on — cards stack and inputs enlarge for touch targets.';
    }
    return 'Responsive layout auto-adjusts: cards stack below 768px; graph summaries stay touch-friendly.';
  }, [mobilePreview]);

  return (
    <section
      aria-label="Graph experience controls"
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        alignItems: 'start',
      }}
    >
      <article
        aria-label="Scale readiness"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          background: '#f8fafc',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>Scale readiness</p>
            <h3 style={{ margin: 0 }}>Graph size</h3>
          </div>
          <span
            data-scale-advisory
            style={{
              padding: '4px 8px',
              borderRadius: 999,
              fontSize: 12,
              background: '#e0f2fe',
              color: '#075985',
            }}
          >
            {nodeCount} nodes · {edgeCount} edges
          </span>
        </header>
        <dl
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            margin: 0,
          }}
        >
          <div>
            <dt style={{ color: '#475569', fontSize: 12 }}>Density</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{density}</dd>
          </div>
          <div>
            <dt style={{ color: '#475569', fontSize: 12 }}>Hairball guard</dt>
            <dd style={{ margin: 0 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={compactGuardEnabled}
                  onChange={(event) => setCompactGuardEnabled(event.target.checked)}
                  aria-label="Toggle compact rendering guard"
                  data-compact-guard
                />
                Compact rendering
              </label>
            </dd>
          </div>
        </dl>
        <p style={{ marginTop: 12, color: '#0f172a' }}>{hairballRisk}</p>
      </article>

      <article
        aria-label="Progressive disclosure"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>Progressive disclosure</p>
            <h3 style={{ margin: 0 }}>Advanced analysis</h3>
          </div>
          <button
            type="button"
            data-accordion-toggle
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((current) => !current)}
            style={{
              border: '1px solid #cbd5e1',
              background: '#0f172a',
              color: '#e2e8f0',
              padding: '6px 10px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {advancedOpen ? 'Hide' : 'Show'} advanced
          </button>
        </div>
        {advancedOpen ? (
          <div data-accordion-panel style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            {DEFAULT_FEATURES.map((feature) => (
              <div
                key={feature.title}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 12,
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    justifyContent: 'space-between',
                  }}
                >
                  <strong>{feature.title}</strong>
                  <button
                    type="button"
                    title={feature.helper}
                    aria-label={feature.helper}
                    style={{
                      borderRadius: '999px',
                      border: '1px solid #cbd5e1',
                      background: '#e2e8f0',
                      width: 28,
                      height: 28,
                      cursor: 'help',
                    }}
                  >
                    ?
                  </button>
                </div>
                <p style={{ margin: '8px 0 0 0' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ marginTop: 12, color: '#475569' }}>
            Keep the core workflow simple. Reveal advanced graph analysis only when analysts request it.
          </p>
        )}
      </article>

      <article
        aria-label="Mobile and tablet UX"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>Mobile & tablet</p>
            <h3 style={{ margin: 0 }}>Responsive safety</h3>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={mobilePreview}
              onChange={(event) => setMobilePreview(event.target.checked)}
              aria-label="Toggle mobile preview mode"
              data-mobile-preview
            />
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
    </section>
  );
}
