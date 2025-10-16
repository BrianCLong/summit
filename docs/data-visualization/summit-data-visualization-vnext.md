# Summit Platform Data Visualization & Fusion vNext

## 1. Executive Summary
Summit already delivers explainable model introspection (IntelGraph) and modular intelligence dashboards. To seize category leadership we will: (1) extend immersive spatio-temporal exploration, (2) fuse multimodal signals with explicit uncertainty, and (3) automate provenance-rich narratives and counterfactual planning. The initiatives in this document yield patent-grade capabilities, shrink analyst time-to-finding by 35%+, and provide defensible differentiators not found in mainstream BI suites.

## 2. Current Platform Assessment
- **Interactive explainability:** IntelGraph exposes embeddings, attribution graphs, and class comparison for large-scale deep nets.
- **Data fusion & modeling:** Maestro/Conductor pipelines already orchestrate cross-source ingestion, ML predictions, and workflow automation.
- **Dashboards:** Static and streaming boards cover intelligence, proposal compliance, OSINT, and operational telemetry.
- **Extensibility:** Plugin-style connectors, APIs, and export flows integrate with downstream orchestration.

## 3. Competitive & Cross-Domain Landscape (2025)
| Segment | Exemplars | Core Strengths | Gaps vs. Summit Vision |
| --- | --- | --- | --- |
| Enterprise BI | Tableau, Power BI, Looker | Highly polished dashboards, AI chart suggestions | Minimal ML explainability, limited OSINT/scientific focus |
| Ops Observability | Grafana, Kibana | Time-series & infra telemetry | No multimodal fusion, limited decision support |
| No/Low-Code Analytics | Qlik, Sisense, Domo | Self-service, mobile, connectors | Weak in spatio-temporal analytics, little provenance |
| Vertical Intelligence | Penlink, Oracle Fusion Intelligence | Geo-temporal overlays, industry models | Proprietary, low flexibility, absent explainability |
| Research & Immersive | Space-time cube, AR/VR labs | Advanced spatio-temporal metaphors | Prototype-only, lack productionization, no narrative exports |
| AI-First Viz Startups | Polymer, Julius, Powerdrill | Automated story generation, NLP interfaces | Shallow modeling, weak governance/audit |

## 4. Gap Analysis & White-Space Opportunities
1. **Immersive explainable space-time exploration** that ties each visual element to model attribution, causal pathways, and provenance.
2. **Uncertainty-forward multimodal fusion** showing data freshness, model drift, and cross-modal corroboration/contradiction.
3. **Adaptive meta-visualization** that changes representations based on data density, modality, and analyst goals.
4. **Counterfactual scenario planning** with geospatial Pareto trade-offs and narrative outputs.
5. **Cryptographically signed provenance ledger** ensuring replayable, regulator-ready artifacts.

## 5. Patent-Aware Innovation Portfolio
| Module | Novelty Highlights | Prior Art Mitigation | Potential Claims |
| --- | --- | --- | --- |
| Space-Time Hypercube Explorer | 3D/VR volume with causal seam carving, counterfactual slicing, attribution overlays | Prior patents stop at icon/time encodings; few integrate explainability or counterfactual overlays | Methods for explainability-integrated space-time navigation and causal comparison |
| Uncertainty-Encoded Event Fields | Layered value/confidence/freshness/drift with directional ambiguity glyphs | Sensor-map patents focus on single uncertainty dimension | Visual synthesis of multi-factor reliability across time/space |
| Meta-Visualization Switchboard | Learned policy recommending view types from telemetry | Existing work is heuristic, not adaptive co-pilots | Adaptive visualization orchestration with human-in-the-loop reinforcement |
| Narrative Map Generator | Auto incident narratives with inline citations, uncertainty, SBOM-provenance bundles | Story points lack provenance & reproducibility | Generation & signing of explainable narrative exports |
| Interactive Scenario Dashboard | Counterfactual twin with geospatial Pareto surfaces | Decision science rarely joined to cartography with explainability | Visualization of dominance frontiers tied to interventions |
| Explainability Graph Canvas | Time-evolving attribution and drift badges on graph edges | Graph UIs rarely integrate model lineage + citations | Display of temporally resolved attribution for graph analytics |
| Multimodal Event Lattice | Alignment/conflict visualization for asynchronous modalities | Multimodal perception patents target robotics, not analyst tooling | Lattice of latent alignment fields with confidence encoding |
| Generative Forecast Theater | Ensemble “director” selecting model families per region with narrative rationale | Forecast UIs lack multi-model explainability | Ensemble orchestration UI with signed rationale |
| Causal Flow Maps | Animated geospatial Sankey of effect sizes with sensitivity overlays | Causal visualizations seldom geospatial + temporal | Methods for geo-causal flow animation with evidence drill-down |
| Provenance Ledger & Audit Lens | Cryptographically replayable analysis sessions, SBOM-backed outputs | Audit logs exist but not tied to viz sessions | Replayable, signed visualization provenance bundles |

## 6. Product Requirements Document (PRD)
```
# PRD: Summit Data Fusion & Visualization vNext (Q4 2025)

## Problem Statement
Intelligence and analytics teams require immersive, explainable spatio-temporal tooling to fuse heterogeneous signals, explore causal structure, and share audit-ready findings. Current solutions lack explainability-first immersion, adaptive visualization policies, and counterfactual simulation.

## Objectives
1. Deliver three novel visualization metaphors unavailable in mainstream BI.
2. Reduce analyst time-to-finding by ≥35% through adaptive, explainable tooling.
3. Provide cryptographically signed, regulator-ready exports for every session.

## Target Users
- **Intel Analyst**: surfaces hidden patterns, anomalies, causal threads.
- **Operations Planner**: evaluates interventions, trade-offs, resource allocation.
- **Executive/Policy Maker**: consumes narratives with assurance of provenance.
- **Compliance Officer**: validates lineage, replayability, SBOM integration.

## Success Metrics
- ≥35% faster investigation completion in beta studies.
- ≥3 novel modules adopted in production workflows.
- 100% of exports include provenance & SBOM bundles.
- Post-launch NPS ≥8 across pilot cohorts.

## Feature Scope
1. **Space-Time Hypercube Explorer**
   - 3D/VR-ready volume navigation with slicing, playback, and counterfactual overlays.
   - Inspector showing value, uncertainty, attribution, and citations.
   - Causal seam carving to reveal suspected causal chains.
2. **Uncertainty-Encoded Event Fields**
   - Hex/contour maps combining value, confidence, freshness, drift, directional ambiguity.
   - Model-family toggle for comparative reliability views.
3. **Meta-Visualization Switchboard**
   - Telemetry-driven advisor suggests optimal view forms with rationale.
   - Learns from analyst acceptance/rejection to refine recommendations.
4. **Narrative Map Generator**
   - Auto-generated geo-temporal narratives with inline uncertainty badges and citations.
   - One-click export producing PDF/HTML plus signed provenance manifest and SBOM.
5. **Interactive Scenario Dashboard**
   - Counterfactual twin with policy toggles, delta maps, geospatial Pareto frontiers.
   - Scenario ledger tracks interventions, authors, timestamps.
6. **Explainability-First Graph Canvas**
   - Time-evolving attribution badges, drift flags, causal thread highlights.
   - Evidence tray linking to source documents and model lineage.
7. **Multimodal Event Lattice**
   - Latent alignment of text/image/audio/sensor streams with corroboration/conflict cues.
   - Confidence controls and modality-family comparisons.
8. **Generative Forecast Theater**
   - Multi-model forecast comparison, calibration/residual dashboards, ensemble “director.”
   - Narrative rationale with signed configuration metadata.
9. **Causal Flow Maps**
   - Animated geo-Sankey flows of inferred causal influence with sensitivity overlays.
10. **Provenance Ledger & Audit Lens**
    - Immutable timeline of analysis actions; replay regenerates identical outputs.
    - Cosign-signed artifacts and SBOM packages for every export.

## Non-Functional Requirements
- Sub-second (≤500 ms P95) viewport interactions on cached tiles; ≤2 s for counterfactual recompute.
- Accessible color encodings (WCAG 2.1 AA). Provide alternative text for key visuals.
- Security: OPA-enforced RBAC, encryption at rest/in transit, signed artifacts via cosign.
- Reliability: multi-AZ deployment, autoscaling, OpenTelemetry tracing.

## Dependencies & Risks
- Requires GPU-enabled services for rendering and ML; ensure autoscaling pools.
- VR/XR optional module must degrade gracefully to 2D/3D web.
- Multimodal ingestion demands updated schema and quality checks.

## Milestones
- M1 (Week 3): Data contracts, ingestion scaffolding, baseline deck.gl views.
- M2 (Week 6): Hypercube MVP, Event Fields, xAI integration.
- M3 (Week 9): Scenario dashboard, meta-switchboard heuristics, provenance ledger beta.
- M4 (Week 12): Full narrative exports, counterfactual ensembles, performance hardening.
- GA Readiness: Accessibility audit, security review, patent disclosures drafted.
```

## 7. Sample Wireframes (Textual)
```
[Space-Time Hypercube Explorer]
+-----------------------------------------------------------------------------------+
| Mode: Explore | Explain | Counterfactual    Search [____________]                |
| Layers: [x] Entities [x] Signals [ ] Drift [x] Uncertainty [ ] Causal Threads     |
|                                                                                   |
|      [  3D volume render with slicing plane; hover tooltip -> value, SHAP, src ]  |
|                                                                                   |
| Time ▮▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  ▶  Speed 1x  Window: 7d          |
| Inspector → Value: 124.6  Uncertainty: ±7.2  Top IG: risk_score, proximity, temp  |
|             Sources: Report-9821 (12 Aug), Sensor-44 (13 Aug)                     |
+-----------------------------------------------------------------------------------+

[Uncertainty-Encoded Event Fields]
+---------------------------------------------------------------+
| Map: Hex layer (value height), opacity = confidence, border   |
| pulsation = data freshness, arrow quivers = directional drift |
| Toggle: Model A | Model B | Ensemble                          |
+---------------------------------------------------------------+

[Interactive Scenario Dashboard]
+--------------------------------------------------------------------------+
| Scenario Toggle: Intervention T-12h [x]  Resource Surge +30% [ ]          |
|                                                                          |
| Left Pane: Actual heatmap + timeline           Right Pane: Counterfactual |
| Bottom: Pareto Frontier (Geo-coded markers)                                |
+--------------------------------------------------------------------------+
```

## 8. User Stories & Acceptance Criteria
| Feature | User Story | Acceptance Criteria |
| --- | --- | --- |
| Space-Time Hypercube | As an analyst, I traverse space-time volumes, inspect attributions, and compare counterfactuals. | Orbit/slice updates ≤150 ms; hover reveals value, uncertainty, top-3 attributions, citations; counterfactual deltas render ≤2 s with narrative summary. |
| Event Fields | As an operator, I evaluate signal reliability including drift and data freshness. | Value/confidence/freshness/drift encodings togglable; comparisons across model families render ≤500 ms; directional ambiguity encoded via quivers. |
| Switchboard | As a user, I receive visualization suggestions that adapt to my workflow. | Advisor displays rationale (density/modality/task); accept/reject telemetry updates policy and improves task time by ≥20% over 30 days. |
| Narrative Map | As a decision-maker, I export explainable stories with provenance. | Narrative sections highlight linked regions; exports bundle PDF/HTML, provenance manifest, SBOM; Audit Lens reproduces identical outputs. |
| Scenario Dashboard | As a planner, I toggle interventions and see geospatial trade-offs. | Policy toggles recompute ≤1 s; delta maps & Pareto surfaces appear ≤2 s; ledger logs author, timestamp, parameters. |
| Graph Canvas | As an investigator, I trace changing influences over time. | Nodes/edges show attribution trends and drift badges; clicking reveals causal evidence, citations; exports include signed appendix. |
| Event Lattice | As an analyst, I align asynchronous modalities and spot contradictions. | Alignment confidence visible; contradictions flagged; clicking reveals synchronized evidence; model-family comparison overlay available. |
| Forecast Theater | As a forecaster, I compare model families and ensembles with rationale. | Fan charts show confidence bands; calibration/residual views per model; “Director” explains ensemble selection and signs configuration metadata. |
| Causal Flow Maps | As a researcher, I visualize causal pathways across regions/time. | Animated flows encode effect size and uncertainty; clicking shows evidence and sensitivity analysis; timeline scrubber animates transitions. |
| Provenance Ledger | As a compliance officer, I replay analyses with tamper evidence. | Every action signed and timestamped; replay regenerates identical outputs; tampering detection alerts via checksum mismatch. |

### Given/When/Then Validation Highlights
- **Space-Time Hypercube**
  - *Given* a dataset exceeding 5M points indexed by H3 resolution 8, *when* an analyst slices along time with the scrubber, *then* the scene updates within 500 ms and the inspector surfaces the top-three SHAP features with signed citations.
  - *Given* a counterfactual intervention toggled in the UI, *when* the user selects "Compare", *then* the delta layer renders with uncertainty deltas and a generated narrative summary referencing the policy toggles.
- **Meta-Visualization Switchboard**
  - *Given* telemetry indicating three consecutive acceptances of the same recommendation, *when* the advisor is next invoked, *then* the recommendation confidence is boosted ≥0.1 and persisted to the feature store.
  - *Given* an analyst rejects a suggestion twice, *when* the advisor surfaces that view again, *then* the rationale must include an updated explanation referencing new data density or goal context.
- **Provenance Ledger & Audit Lens**
  - *Given* an export occurs, *when* Audit Lens is triggered, *then* it reconstructs the exported artifact byte-for-byte and surfaces a verification badge within the UI.
  - *Given* any event signature fails verification, *when* the ledger view loads, *then* the affected row is highlighted and a webhook triggers to compliance tooling within 60 seconds.

## 9. Data Contracts & Schemas
- **ObservedSignal (core layer):**
  | Field | Type | Description |
  | --- | --- | --- |
  | `signal_id` | UUID | Primary identifier for individual observations. |
  | `lat` / `lon` | Float | WGS84 coordinates snapped to H3 resolution 8. |
  | `ts` | ISO 8601 | Event timestamp with millisecond precision. |
  | `value` | Float | Normalized analytic value (e.g., risk score). |
  | `uncertainty` | Float (0–1) | Aggregated epistemic/aleatoric error. |
  | `freshness_sec` | Integer | Seconds since last raw ingest. |
  | `source_refs` | Array<URI> | Signed URIs pointing to raw evidence. |

- **ModalityAsset (multimodal fusion):**
  | Field | Type | Notes |
  | --- | --- | --- |
  | `asset_id` | UUID | Links to raw text/image/audio payloads. |
  | `modality` | Enum(`text`,`image`,`audio`,`sensor`,`video`) | Drives alignment pipelines. |
  | `embedding` | Vector<float32, 1024> | Stored in Milvus/pgvector for retrieval. |
  | `alignment_window` | [ts_start, ts_end] | Derived by latent alignment service. |
  | `confidence` | Float (0–1) | Posterior probability of alignment correctness. |

- **ScenarioRun (counterfactual twin):**
  | Field | Type | Description |
  | --- | --- | --- |
  | `scenario_id` | UUID | Links actual vs. counterfactual run. |
  | `policy_toggles` | JSONB | Feature flags and parameter adjustments. |
  | `delta_metrics` | Map<string,float> | KPI deltas (coverage, risk, cost). |
  | `pareto_frontier` | Array<GeoJSON> | Polygons representing non-dominated solutions. |

- **ProvenanceEvent (ledger/audit):**
  | Field | Type | Description |
  | --- | --- | --- |
  | `event_id` | UUID | Tamper-evident event identifier. |
  | `actor_id` | String | Human or service principal. |
  | `action` | Enum | `view`, `filter`, `intervention`, `export`, etc. |
  | `payload_hash` | SHA-256 | Hash of serialized parameters. |
  | `sig` | Sigstore bundle | Cosign signature + certificate chain. |
  | `replay_pointer` | URI | Pointer to deterministic replay artifact (e.g., parquet snapshot). |

### JSON Schema (ObservedSignal excerpt)
```json
{
  "$id": "https://schemas.summit.io/viz/observed-signal.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["signal_id", "lat", "lon", "ts", "value", "uncertainty", "source_refs"],
  "properties": {
    "signal_id": { "type": "string", "format": "uuid" },
    "lat": { "type": "number", "minimum": -90, "maximum": 90 },
    "lon": { "type": "number", "minimum": -180, "maximum": 180 },
    "ts": { "type": "string", "format": "date-time" },
    "value": { "type": "number" },
    "uncertainty": { "type": "number", "minimum": 0, "maximum": 1 },
    "freshness_sec": { "type": "integer", "minimum": 0 },
    "source_refs": {
      "type": "array",
      "items": { "type": "string", "format": "uri" },
      "minItems": 1
    }
  }
}
```

## 10. API Surface & Integration Points
- **REST**
  | Endpoint | Method | Description | Request Contract | Response |
  | --- | --- | --- | --- | --- |
  | `/api/v1/signals` | `POST` | Batch ingest ObservedSignal entities | `observed-signal.json` | 207 multi-status with per-record sigstore receipt |
  | `/api/v1/scenario-runs/{id}` | `PUT` | Launch counterfactual run | `ScenarioRun` payload | Run handle + WebSocket channel |
  | `/api/v1/provenance/export/{id}` | `GET` | Download signed narrative bundle | Query `format=pdf&#124;html&#124;zip` | Binary artifact + provenance manifest |

- **GraphQL (read path)**
  ```graphql
  query AnalystWorkspace($bbox: BBoxInput!, $window: TimeWindowInput!) {
    observedSignals(bbox: $bbox, window: $window) {
      signalId
      coordinates { lat lon }
      ts
      value
      uncertainty
      topAttributions(limit: 3) { feature weight }
      sourceRefs { uri label signed }
    }
    scenarioRuns(window: $window) {
      scenarioId
      policyToggles
      deltaMetrics { key value }
      paretoFrontierGeojson
    }
  }
  ```

- **Event Topics (Kafka/Flink)**
  | Topic | Producer | Consumer | Notes |
  | --- | --- | --- | --- |
  | `viz.observed-signal.raw` | Connectors | Fusion service | Raw ingest, schema enforced via Confluent schema registry. |
  | `viz.counterfactual.completed` | Simulation service | Narrative generator | Contains signed metrics + drift comparisons. |
  | `viz.meta-telemetry` | Client apps | Switchboard learner | Captures accept/reject actions with context. |

## 11. Telemetry & Learning Loop
- **Client Events:** `view_loaded`, `advisor_recommended`, `advisor_decision`, `slice_interaction`, `scenario_commit`, all with anonymized session + role metadata.
- **Feature Store Signals:** Rolling acceptance rate, task completion delta, anomaly detection on interaction latency (for auto-scaling triggers).
- **Model Update Cadence:**
  - Switchboard policy retrain nightly with differential privacy noise.
  - Uncertainty calibration weekly using holdout ground truth and reliability diagrams.
- **Success Dashboards:** Grafana boards wiring OpenTelemetry traces with narrative export counts, replay success %, SBOM issuance time.

## 12. Testing & Validation Strategy
- **Automated Pyramid:**
  - Unit: React Testing Library for timeline, deck.gl layers; PyTest for fusion services.
  - Integration: Cypress/Playwright XR-compatible tests, contract tests against JSON schemas.
  - Simulation: Golden scenario notebooks verifying counterfactual deltas + Pareto correctness.
- **Performance Gates:** Lighthouse XR mode, deck.gl frame budget (≥55 FPS on RTX 3070, ≥30 FPS on Intel Iris).
- **Security & Compliance:** OPA policy regression tests, cosign signature verification in CI, SBOM diff scan per release.
- **Human Validation:** Analyst ride-alongs, compliance dry-runs, XR usability labs with accessibility accommodations.

## 13. Technical Architecture & Code References
- **Frontend:** React + deck.gl/Kepler.gl for geo layers, Three.js/react-three-fiber for 3D volume, Cytoscape.js or AntV G6 for graphs, Zustand/Recoil for state, Recharts/Plotly for supporting charts.
- **Rendering Pipelines:** WebGL instancing for million-point datasets; H3 hex indexing; progressive loading via Apache Arrow streams.
- **Backend Services:** Python ST-GNN & transformer services (PyTorch Geometric, HuggingFace), probabilistic forecasting (Pyro, TensorFlow Probability), causal inference (DoWhy/EconML).
- **Explainability:** Captum/SHAP for attributions; MC Dropout / ensembles for uncertainty; integrated into REST/GraphQL responses.
- **Data Infrastructure:** Kafka/Flink for streams, S3 + Parquet/Arrow lakehouse, DuckDB/Trino for ad-hoc queries, PostGIS for geospatial indexing.
- **Provenance & Security:** OpenTelemetry tracing, OPA for policy enforcement, Sigstore/cosign for artifact signing, Syft/Grype for SBOM, SLSA-compliant GitHub Actions pipelines.

### Code Skeletons
- **Spatio-temporal hex layer (deck.gl):** `docs/snippets/spatiotemporal-hex.tsx`
- **3D slicing plane (react-three-fiber):** `docs/snippets/volume-slice.tsx`
- **Time window control (React/visx):** `docs/snippets/timeline-control.tsx`
- **Meta-switchboard policy advisor:** `docs/snippets/meta-switchboard-advisor.ts`
- **ST-GNN baseline (PyTorch Geometric):** `docs/snippets/stgnn.py`
- **SHAP attachment pipeline:** `docs/snippets/shap_attach.py`
- **Provenance ledger schema:** `docs/snippets/provenance-ledger-schema.sql`
- **REST/OpenAPI excerpt:** `docs/snippets/api-surface.yaml`

*(See section 15 for snippet contents.)*

## 14. Implementation Blueprint (90-Day)
1. **Weeks 0–2:** finalize schemas, upgrade ingestion (Kafka topics, Arrow contracts); scaffold React shells and timeline controls.
2. **Weeks 2–5:** deliver Event Fields MVP, Hypercube base, and narrative export skeleton; integrate MC Dropout uncertainty.
3. **Weeks 4–8:** build scenario twin, meta-switchboard heuristics, provenance ledger with cosign signing; onboard ST-GNN forecasting service.
4. **Weeks 6–10:** add multimodal alignment, graph explainability overlays, generative forecast theater; start patent prior-art sweeps & drafting.
5. **Weeks 10–12:** accessibility & performance hardening, final SBOM/provenance packaging, red-team XR module, prepare GA launch assets.

## 15. Snippet Library
```tsx
// docs/snippets/spatiotemporal-hex.tsx
import { DeckGL } from '@deck.gl/react';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { MapView } from '@deck.gl/core';
import { useMemo, useState } from 'react';

type Datum = { lat: number; lon: number; ts: number; value: number; uncertainty: number; sources: string[] };

export function SpatioTemporalHex({ data, window }: { data: Datum[]; window: [number, number] }) {
  const [range, setRange] = useState(window);
  const filtered = useMemo(
    () => data.filter((d) => d.ts >= range[0] && d.ts <= range[1]),
    [data, range]
  );

  const layer = new HexagonLayer({
    id: 'signal-hex',
    data: filtered,
    getPosition: (d: Datum) => [d.lon, d.lat],
    getElevationWeight: (d: Datum) => d.value,
    getColorWeight: (d: Datum) => 1 - d.uncertainty,
    colorAggregation: 'MEAN',
    elevationScale: 12,
    extruded: true,
    radius: 500,
    pickable: true,
    onHover: (info) => {
      if (info.object) {
        const { value, uncertainty, sources } = info.object;
        console.log({ value, uncertainty, sources });
      }
    }
  });

  return <DeckGL views={new MapView({ repeat: true })} controller layers={[layer]} />;
}
```
```tsx
// docs/snippets/volume-slice.tsx
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type VolumeSliceProps = { texture: THREE.DataTexture3D; planeZ: number };

export function VolumeSlice({ texture, planeZ }: VolumeSliceProps) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        tex3D: { value: texture },
        sliceZ: { value: planeZ }
      },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler3D tex3D;
        uniform float sliceZ;
        void main() {
          vec3 samplePos = vec3(vUv, sliceZ);
          vec4 voxel = texture(tex3D, samplePos);
          float uncertainty = voxel.a;
          gl_FragColor = vec4(voxel.rgb, 1.0 - uncertainty);
        }
      `,
      transparent: true
    });
  }, [texture, planeZ]);

  useFrame(() => {
    material.uniforms.sliceZ.value = planeZ;
  });

  return (
    <mesh>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
```
```python
# docs/snippets/stgnn.py
import torch
from torch_geometric.nn import GCNConv
from torch_geometric_temporal.nn.recurrent import GConvGRU

class SpatioTemporalModel(torch.nn.Module):
    def __init__(self, in_channels: int, hidden_channels: int, out_channels: int) -> None:
        super().__init__()
        self.recurrent = GConvGRU(in_channels, hidden_channels, K=3)
        self.projection = torch.nn.Linear(hidden_channels, out_channels)

    def forward(self, features_seq, edges_seq):
        hidden = None
        for x_t, edge_index_t in zip(features_seq, edges_seq):
            hidden = self.recurrent(x_t, edge_index_t, hidden)
        return self.projection(hidden)
```
```python
# docs/snippets/shap_attach.py
import shap

def attach_shap(model, feature_frame, metadata):
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(feature_frame)
    baseline = explainer.expected_value
    return [
        {
            **meta,
            "baseline": baseline.tolist() if hasattr(baseline, "tolist") else baseline,
            "shap": values.tolist(),
            "top_attribution": sorted(
                zip(feature_frame.columns, values),
                key=lambda pair: abs(pair[1]),
                reverse=True
            )[:3]
        }
        for meta, values in zip(metadata, shap_values)
    ]
```
```tsx
// docs/snippets/timeline-control.tsx
import { useMemo } from 'react';
import { scaleLinear } from '@visx/scale';
import { Brush } from '@visx/brush';
import { LinePath } from '@visx/shape';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';

export type TimeSeriesPoint = {
  ts: number;
  value: number;
};

export type TimelineControlProps = {
  width: number;
  height: number;
  series: TimeSeriesPoint[];
  window: [number, number];
  onWindowChange: (window: [number, number]) => void;
};

export function TimelineControl({ width, height, series, window, onWindowChange }: TimelineControlProps) {
  const padding = 16;
  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [Math.min(...series.map((d) => d.ts)), Math.max(...series.map((d) => d.ts))],
        range: [padding, width - padding]
      }),
    [series, width]
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, Math.max(...series.map((d) => d.value || 0)) || 1],
        range: [height - padding, padding]
      }),
    [series, height]
  );

  const handleBrushChange = (domain: { x0: number; x1: number } | null) => {
    if (!domain) return;
    const next: [number, number] = [xScale.invert(domain.x0), xScale.invert(domain.x1)];
    onWindowChange(next);
  };

  const initialBrushPosition = useMemo(() => {
    return {
      start: { x: xScale(window[0]), y: padding },
      end: { x: xScale(window[1]), y: height - padding }
    };
  }, [window, xScale, height]);

  return (
    <svg width={width} height={height} role="img" aria-label="Timeline control">
      <Group>
        <LinePath
          data={series}
          x={(d) => xScale(d.ts)}
          y={(d) => yScale(d.value)}
          stroke="#2563eb"
          strokeWidth={2}
          curve={null}
        />
        <Brush
          width={width - padding * 2}
          height={height - padding * 2}
          margin={{ top: padding, left: padding, bottom: padding, right: padding }}
          resizeTriggerAreas={['left', 'right']}
          selectedBoxStyle={{ fill: '#2563eb33', stroke: '#2563eb' }}
          handleSize={8}
          initialBrushPosition={initialBrushPosition}
          onChange={handleBrushChange}
          onMouseMove={(brush) => {
            const point = localPoint(brush.event);
            if (point) {
              brush.updateBrush((prev) => ({
                ...prev,
                extent: {
                  x0: Math.min(point.x, prev.extent.x0),
                  x1: Math.max(point.x, prev.extent.x1),
                  y0: prev.extent.y0,
                  y1: prev.extent.y1
                }
              }));
            }
          }}
        />
      </Group>
    </svg>
  );
}
```
```ts
// docs/snippets/meta-switchboard-advisor.ts
export type AdvisorContext = {
  modalityCount: number;
  seriesDensity: 'sparse' | 'medium' | 'dense';
  requiresCausality: boolean;
  geoSpreadKm: number;
  userIntent: 'explore' | 'explain' | 'counterfactual' | 'narrative';
  acceptedRecommendations: number;
  rejectedRecommendations: number;
};

export type VisualizationRecommendation = {
  id: string;
  label: string;
  rationale: string;
  confidence: number;
};

const VIEW_PRIORS: Record<string, VisualizationRecommendation> = {
  hypercube: {
    id: 'hypercube',
    label: 'Space-Time Hypercube',
    rationale: 'Immersive 3D slice through time and space',
    confidence: 0.6
  },
  eventField: {
    id: 'eventField',
    label: 'Uncertainty Event Field',
    rationale: 'Layered reliability and drift overlays',
    confidence: 0.55
  },
  graphCanvas: {
    id: 'graphCanvas',
    label: 'Explainability Graph Canvas',
    rationale: 'Temporal attribution trail across entities',
    confidence: 0.5
  },
  scenarioTwin: {
    id: 'scenarioTwin',
    label: 'Scenario Twin Dashboard',
    rationale: 'Counterfactual deltas and Pareto surfaces',
    confidence: 0.5
  },
  narrative: {
    id: 'narrative',
    label: 'Narrative Map Generator',
    rationale: 'Auto-generated brief with citations',
    confidence: 0.45
  }
};

export function recommendVisualization(context: AdvisorContext): VisualizationRecommendation {
  const recommendation = { ...VIEW_PRIORS.hypercube };
  let score = recommendation.confidence;

  if (context.userIntent === 'counterfactual') {
    return { ...VIEW_PRIORS.scenarioTwin, confidence: 0.75 };
  }

  if (context.requiresCausality) {
    score += 0.15;
  }

  if (context.modalityCount > 2) {
    return { ...VIEW_PRIORS.eventField, confidence: 0.7 };
  }

  if (context.seriesDensity === 'dense' || context.geoSpreadKm > 500) {
    score += 0.1;
  }

  const totalRecommendations = context.acceptedRecommendations + context.rejectedRecommendations;
  const acceptanceRatio = totalRecommendations === 0 ? 0.5 : context.acceptedRecommendations / totalRecommendations;
  const calibratedConfidence = Math.min(0.9, Math.max(0.2, score * (0.8 + acceptanceRatio * 0.4)));

  if (context.userIntent === 'narrative') {
    return { ...VIEW_PRIORS.narrative, confidence: calibratedConfidence };
  }

  if (context.requiresCausality) {
    return { ...VIEW_PRIORS.graphCanvas, confidence: calibratedConfidence };
  }

  return { ...recommendation, confidence: calibratedConfidence };
}
```
```sql
-- docs/snippets/provenance-ledger-schema.sql
CREATE TABLE IF NOT EXISTS provenance_event (
  event_id UUID PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human', 'service')),
  action TEXT NOT NULL,
  action_context JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash TEXT NOT NULL,
  signature BYTEA NOT NULL,
  certificate_chain BYTEA NOT NULL,
  replay_pointer TEXT NOT NULL,
  session_id UUID NOT NULL,
  INDEX idx_provenance_actor_time (actor_id, occurred_at),
  INDEX idx_provenance_action (action)
);

CREATE TABLE IF NOT EXISTS provenance_replay_artifact (
  artifact_id UUID PRIMARY KEY,
  event_id UUID REFERENCES provenance_event(event_id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('parquet', 'json', 'pdf', 'html', 'zip')),
  storage_uri TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE MATERIALIZED VIEW IF NOT EXISTS provenance_session_digest AS
SELECT
  session_id,
  MIN(occurred_at) AS session_start,
  MAX(occurred_at) AS session_end,
  COUNT(*) AS event_count,
  COUNT(DISTINCT action) AS unique_actions,
  bool_and(signature IS NOT NULL) AS all_signed
FROM provenance_event
GROUP BY session_id;
```
```yaml
# docs/snippets/api-surface.yaml
openapi: 3.1.0
info:
  title: Summit Visualization Platform
  version: "0.1.0"
paths:
  /api/v1/signals:
    post:
      summary: Ingest observed signals
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: 'https://schemas.summit.io/viz/observed-signal.json#/$defs/batch'
      responses:
        '207':
          description: Multi-status response with per-record receipts
          content:
            application/json:
              schema:
                type: object
                properties:
                  receipts:
                    type: array
                    items:
                      type: object
                      properties:
                        signal_id:
                          type: string
                          format: uuid
                        status:
                          type: string
                          enum: [accepted, rejected]
                        signature:
                          type: string
                        message:
                          type: string
  /api/v1/scenario-runs/{id}:
    put:
      summary: Launch a counterfactual simulation run
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                policy_toggles:
                  type: object
                start_ts:
                  type: string
                  format: date-time
                end_ts:
                  type: string
                  format: date-time
      responses:
        '202':
          description: Simulation accepted
          content:
            application/json:
              schema:
                type: object
                properties:
                  scenario_id:
                    type: string
                    format: uuid
                  websocket_channel:
                    type: string
  /api/v1/provenance/export/{id}:
    get:
      summary: Download signed narrative bundle
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
            format: uuid
        - in: query
          name: format
          schema:
            type: string
            enum: [pdf, html, zip]
      responses:
        '200':
          description: Signed artifact
          headers:
            x-summit-sigstore-bundle:
              schema:
                type: string
          content:
            application/zip:
              schema:
                type: string
                format: binary
            application/pdf:
              schema:
                type: string
                format: binary
            text/html:
              schema:
                type: string
```

## 16. IP & Patent Strategy
1. Conduct prior-art sweeps around counterfactual spatio-temporal visualization, provenance-signing workflows, and adaptive visualization policy engines.
2. Draft provisional claims for each module focusing on explainability integration, multimodal alignment visualization, and replayable provenance bundles.
3. Create claim charts referencing UI flows, data structures, and signing mechanisms; collaborate with counsel to prioritize filings aligned with roadmap milestones.
4. Establish invention disclosure pipeline within 6 weeks, capturing diagrams, interaction mockups, and algorithm descriptions.

## 17. Delivery Resources & Next Steps
- **Design:** Figma prototypes for Hypercube, Event Fields, and Scenario Dashboard (ETA Week 2).
- **Data:** Curate three demo datasets (synthetic incident fusion, mobility+sensor drift, multimodal OSINT) with sharing agreements.
- **Engineering Kits:** Turbo monorepo template with React/Node/Python services, GitHub Actions (OIDC, SLSA, cosign), IaC modules for AWS GPU workloads.
- **Operations:** Define governance policies (OPA), retention schedules, SBOM automation, and compliance checklists.
- **Enablement:** Produce playbooks, demo scripts, and narrative templates for sales, analysts, and partner ecosystems.

## 18. Immediate Actions
1. Socialize PRD with leadership; secure resourcing for XR experimentation and causal inference SMEs.
2. Begin prototype spikes: deck.gl Event Fields, Three.js hypercube slicing, SHAP-based attribution overlays.
3. Kick off patentability assessments and invention disclosures per module.
4. Schedule design sprints for meta-switchboard interactions and narrative exports; include compliance stakeholders.
5. Stand up telemetry collection to feed meta-visualization learning loops from day one.

---
*Prepared for Summit Platform leadership to fast-track development of disruptive, patent-ready data visualization experiences.*
