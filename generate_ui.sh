mkdir -p packages/summit-ui/src/features/coggeo/components
mkdir -p packages/summit-ui/src/features/coggeo/hooks

cat << 'INNER_EOF' > packages/summit-ui/src/features/coggeo/hooks/useCogGeoApi.ts
import { useCallback } from "react";

export type ExplainKind = "storm" | "well" | "fault" | "plate" | "current" | "terrain";

export interface ExplainPayload {
  id: string;
  kind: ExplainKind;
  summary: string;
  drivers: Array<{ name: string; delta: number; evidence: string[] }>;
  top_narratives?: Array<{ narrative_id: string; role: string; evidence: string[] }>;
  confidence: number;
  provenance: { models: string[]; prompt_ids?: string[] };
}

export function useCogGeoApi(baseUrl = "/coggeo") {
  const getHealth = useCallback(async () => {
    const r = await fetch(\`\${baseUrl}/health\`);
    if (!r.ok) throw new Error(\`getHealth failed: \${r.status}\`);
    return await r.json();
  }, [baseUrl]);

  const listNarratives = useCallback(async () => {
    const r = await fetch(\`\${baseUrl}/narratives\`);
    if (!r.ok) throw new Error(\`listNarratives failed: \${r.status}\`);
    return (await r.json()) as Array<{ id: string; title: string }>;
  }, [baseUrl]);

  const listStorms = useCallback(async (args: { timeRange: string; narrativeId?: string }) => {
    const u = new URL(\`\${window.location.origin}\${baseUrl}/storms\`);
    u.searchParams.set("timeRange", args.timeRange);
    if (args.narrativeId) u.searchParams.set("narrativeId", args.narrativeId);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(\`listStorms failed: \${r.status}\`);
    return (await r.json()) as Array<{ id: string; narrative_id: string; start_ts: string; severity: number; explain_ref: string }>;
  }, [baseUrl]);

  const getExplain = useCallback(async (explainId: string) => {
    const r = await fetch(\`\${baseUrl}/explain/\${encodeURIComponent(explainId)}\`);
    if (!r.ok) throw new Error(\`getExplain failed: \${r.status}\`);
    return (await r.json()) as ExplainPayload;
  }, [baseUrl]);

  return { getHealth, listNarratives, listStorms, getExplain };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-ui/src/features/coggeo/components/LayerToggles.tsx
import React from "react";

export type LayerKind = "pressure" | "temperature" | "storm" | "wind" | "turbulence";

export function LayerToggles(props: {
  enabled: Record<LayerKind, boolean>;
  onToggle: (k: LayerKind) => void;
}) {
  const items: LayerKind[] = ["pressure", "temperature", "storm", "wind", "turbulence"];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((k) => (
        <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={props.enabled[k]}
            onChange={() => props.onToggle(k)}
          />
          <span>{k}</span>
        </label>
      ))}
    </div>
  );
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-ui/src/features/coggeo/components/NarrativePicker.tsx
import React from "react";

export function NarrativePicker(props: {
  narratives: Array<{ id: string; title: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span>Narrative</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.narratives.map((n) => (
          <option key={n.id} value={n.id}>
            {n.title}
          </option>
        ))}
      </select>
    </label>
  );
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-ui/src/features/coggeo/components/ExplainDrawer.tsx
import React from "react";
import type { ExplainPayload } from "../hooks/useCogGeoApi.js";

export function ExplainDrawer(props: {
  open: boolean;
  onClose: () => void;
  payload: ExplainPayload | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (!props.open) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 420,
        height: "100%",
        background: "rgba(255,255,255,0.98)",
        borderLeft: "1px solid #e5e7eb",
        padding: 16,
        overflow: "auto",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.10)",
        zIndex: 3,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>Explain</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Evidence-backed interpretation</div>
        </div>
        <button
          onClick={props.onClose}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      {props.loading && <div style={{ color: "#374151" }}>Loading explanation…</div>}
      {props.error && <div style={{ color: "#b91c1c" }}>{props.error}</div>}

      {props.payload && (
        <>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              background: "#f9fafb",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>Kind</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{props.payload.kind}</div>

            <div style={{ fontSize: 12, color: "#6b7280" }}>Confidence</div>
            <div style={{ fontWeight: 600 }}>{props.payload.confidence.toFixed(2)}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Summary</div>
            <div style={{ lineHeight: 1.5 }}>{props.payload.summary}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Drivers</div>
            {props.payload.drivers.length === 0 ? (
              <div style={{ color: "#6b7280" }}>(none)</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {props.payload.drivers.map((d) => (
                  <div
                    key={\`\${d.name}-\${d.delta}\`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{d.name}</strong>
                      <span>Δ {d.delta.toFixed(3)}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                      Evidence refs: {d.evidence.join(", ") || "(none)"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {props.payload.top_narratives && props.payload.top_narratives.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Top narratives</div>
              <div style={{ display: "grid", gap: 8 }}>
                {props.payload.top_narratives.map((n) => (
                  <div
                    key={\`\${n.narrative_id}-\${n.role}\`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div><strong>{n.narrative_id}</strong></div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Role: {n.role}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Evidence: {n.evidence.join(", ") || "(none)"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Provenance</div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                background: "#111827",
                color: "#f9fafb",
                borderRadius: 10,
                padding: 12,
              }}
            >
              {JSON.stringify(props.payload.provenance, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-ui/src/features/coggeo/components/MapboxTerrainLayer.tsx
import React, { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { LayerKind } from "./LayerToggles.js";

export type HoverFeatureSummary = {
  id: string;
  explainId: string | null;
  h3: string | null;
  narrativeId: string | null;
  value: string | number | null;
  pressure?: number | null;
  temperature?: number | null;
  stormScore?: number | null;
  turbulence?: number | null;
};

type Props = {
  mapboxToken: string;
  narrativeId: string;
  tsBucket: string;
  layer: LayerKind;
  onExplain: (explainId: string) => void;
  onHoverFeature?: (feature: HoverFeatureSummary | null) => void;
};

function colorExpression(layer: LayerKind) {
  switch (layer) {
    case "pressure":
      return [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "pressure"]], 0],
        0, "#f3f4f6",
        20, "#c7d2fe",
        60, "#818cf8",
        100, "#4338ca",
        150, "#312e81",
      ];
    case "temperature":
      return [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "temperature"]], 0],
        0, "#ecfeff",
        0.25, "#67e8f9",
        0.5, "#22d3ee",
        0.75, "#0891b2",
        1, "#164e63",
      ];
    case "turbulence":
      return [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "turbulence"]], 0],
        0, "#f9fafb",
        0.1, "#fde68a",
        0.25, "#f59e0b",
        0.5, "#b45309",
        1, "#78350f",
      ];
    case "wind":
      return "#93c5fd";
    case "storm":
    default:
      return [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "storm_score"]], 0],
        0, "#f8fafc",
        0.25, "#fecaca",
        0.5, "#f87171",
        0.75, "#dc2626",
        1, "#7f1d1d",
      ];
  }
}

export function MapboxTerrainLayer(props: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sourceId = "coggeo-terrain";
  const fillLayerId = "coggeo-terrain-fill";
  const lineLayerId = "coggeo-terrain-outline";

  const tileUrl = useMemo(() => {
    return (
      \`/coggeo/terrain/tiles/{z}/{x}/{y}\` +
      \`?narrativeId=\${encodeURIComponent(props.narrativeId)}\` +
      \`&tsBucket=\${encodeURIComponent(props.tsBucket)}\` +
      \`&layer=\${encodeURIComponent(props.layer)}\` +
      \`&format=mvt\`
    );
  }, [props.narrativeId, props.tsBucket, props.layer]);

  useEffect(() => {
    mapboxgl.accessToken = props.mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-105.55, 39.05],
      zoom: 6,
      attributionControl: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource(sourceId, {
        type: "vector",
        tiles: [tileUrl],
        minzoom: 0,
        maxzoom: 14,
      });

      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        "source-layer": "terrain",
        paint: {
          "fill-color": colorExpression(props.layer) as any,
          "fill-opacity": 0.7,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        "source-layer": "terrain",
        paint: {
          "line-color": "#374151",
          "line-width": 0.6,
          "line-opacity": 0.25,
        },
      });

      map.on("mousemove", fillLayerId, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        const p: any = f?.properties ?? {};
        props.onHoverFeature?.({
          id: String(p.id ?? ""),
          explainId: p.explain_id ? String(p.explain_id) : null,
          h3: p.h3 ? String(p.h3) : null,
          narrativeId: p.narrative_id ? String(p.narrative_id) : null,
          value: p.value ?? null,
          pressure: p.pressure != null ? Number(p.pressure) : null,
          temperature: p.temperature != null ? Number(p.temperature) : null,
          stormScore: p.storm_score != null ? Number(p.storm_score) : null,
          turbulence: p.turbulence != null ? Number(p.turbulence) : null,
        });
      });

      map.on("mouseleave", fillLayerId, () => {
        map.getCanvas().style.cursor = "";
        props.onHoverFeature?.(null);
      });

      map.on("click", fillLayerId, (e) => {
        const f = e.features?.[0];
        const p: any = f?.properties ?? {};
        const explainId = p.explain_id ? String(p.explain_id) : p.id ? \`explain:\${String(p.id)}\` : null;
        if (explainId) props.onExplain(explainId);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer(fillLayerId)) {
      map.setPaintProperty(fillLayerId, "fill-color", colorExpression(props.layer) as any);
    }

    const src = map.getSource(sourceId) as any;
    if (src?.setTiles) {
      src.setTiles([tileUrl]);
    } else {
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      map.addSource(sourceId, {
        type: "vector",
        tiles: [tileUrl],
        minzoom: 0,
        maxzoom: 14,
      });

      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        "source-layer": "terrain",
        paint: {
          "fill-color": colorExpression(props.layer) as any,
          "fill-opacity": 0.7,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        "source-layer": "terrain",
        paint: {
          "line-color": "#374151",
          "line-width": 0.6,
          "line-opacity": 0.25,
        },
      });
    }

    map.triggerRepaint();
  }, [tileUrl, props.layer]);

  return <div ref={containerRef} style={{ height: 560, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }} />;
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-ui/src/features/coggeo/components/CogGeoLegend.tsx
import React from "react";
import type { LayerKind } from "./LayerToggles.js";

export function CogGeoLegend(props: { layer: LayerKind }) {
  const labels: Record<LayerKind, { title: string; low: string; high: string }> = {
    storm: { title: "Storm score", low: "Low", high: "High" },
    pressure: { title: "Pressure", low: "Low", high: "High" },
    temperature: { title: "Temperature", low: "Cool", high: "Hot" },
    turbulence: { title: "Turbulence", low: "Stable", high: "Chaotic" },
    wind: { title: "Wind", low: "Weak", high: "Strong" },
  };

  return (
    <div
      style={{
        minWidth: 180,
        background: "rgba(255,255,255,0.92)",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 10,
        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{labels[props.layer].title}</div>
      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "linear-gradient(to right, #f8fafc, #fecaca, #dc2626, #7f1d1d)",
          marginBottom: 6,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#4b5563" }}>
        <span>{labels[props.layer].low}</span>
        <span>{labels[props.layer].high}</span>
      </div>
    </div>
  );
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-ui/src/features/coggeo/components/HoverCard.tsx
import React from "react";
import type { HoverFeatureSummary } from "./MapboxTerrainLayer.js";

export function HoverCard(props: { feature: HoverFeatureSummary | null }) {
  if (!props.feature) return null;

  return (
    <div
      style={{
        minWidth: 240,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 12,
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Terrain cell</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{props.feature.id}</div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 8px", fontSize: 13 }}>
        <div style={{ color: "#6b7280" }}>H3</div>
        <div>{props.feature.h3 ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Narrative</div>
        <div>{props.feature.narrativeId ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Value</div>
        <div>{props.feature.value ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Pressure</div>
        <div>{props.feature.pressure ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Temp</div>
        <div>{props.feature.temperature ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Storm</div>
        <div>{props.feature.stormScore ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Turbulence</div>
        <div>{props.feature.turbulence ?? "—"}</div>
      </div>
    </div>
  );
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-ui/src/features/coggeo/CognitiveWeatherRadarPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useCogGeoApi, type ExplainPayload } from "./hooks/useCogGeoApi.js";
import { NarrativePicker } from "./components/NarrativePicker.js";
import { LayerToggles, type LayerKind } from "./components/LayerToggles.js";
import { ExplainDrawer } from "./components/ExplainDrawer.js";
import { MapboxTerrainLayer, type HoverFeatureSummary } from "./components/MapboxTerrainLayer.js";
import { CogGeoLegend } from "./components/CogGeoLegend.js";
import { HoverCard } from "./components/HoverCard.js";

const DEFAULT_NARRATIVE_ID = "nar:demo-corruption-backlash";
const DEFAULT_TS_BUCKET = "hourly:2026-03-05T07";

export function CognitiveWeatherRadarPage() {
  const api = useCogGeoApi("/coggeo");

  const [narratives, setNarratives] = useState<Array<{ id: string; title: string }>>([]);
  const [narrativeId, setNarrativeId] = useState<string>(DEFAULT_NARRATIVE_ID);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [tsBucket, setTsBucket] = useState<string>(DEFAULT_TS_BUCKET);

  const [layers, setLayers] = useState<Record<LayerKind, boolean>>({
    pressure: false,
    temperature: false,
    storm: true,
    wind: false,
    turbulence: false,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainPayload, setExplainPayload] = useState<ExplainPayload | null>(null);

  const [hoverFeature, setHoverFeature] = useState<HoverFeatureSummary | null>(null);

  const [backendStatus, setBackendStatus] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
    api.getHealth()
      .then(() => setBackendStatus("up"))
      .catch(() => setBackendStatus("down"));
  }, [api]);

  useEffect(() => {
    api.listNarratives()
      .then((rows) => {
        if (rows.length > 0) {
          setNarratives(rows);
          setNarrativeId((current) => current || rows[0]!.id);
        } else {
          setNarratives([{ id: DEFAULT_NARRATIVE_ID, title: "Corruption and waste backlash" }]);
        }
      })
      .catch(() => {
        setNarratives([{ id: DEFAULT_NARRATIVE_ID, title: "Corruption and waste backlash" }]);
      });
  }, [api]);

  const openExplain = async (explainId: string) => {
    setDrawerOpen(true);
    setExplainLoading(true);
    setExplainError(null);
    setExplainPayload(null);

    try {
      const payload = await api.getExplain(explainId);
      setExplainPayload(payload);
    } catch (e: any) {
      setExplainError(e?.message ?? "Failed to load explanation");
    } finally {
      setExplainLoading(false);
    }
  };

  const onToggle = (k: LayerKind) => {
    setLayers((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const activeLayer = useMemo<LayerKind>(() => {
    if (layers.storm) return "storm";
    if (layers.pressure) return "pressure";
    if (layers.temperature) return "temperature";
    if (layers.turbulence) return "turbulence";
    if (layers.wind) return "wind";
    return "storm";
  }, [layers]);

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 12, padding: 16, height: "100%" }}>
      {backendStatus === "down" && (
        <div
          style={{
            padding: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          CogGeo backend is not reachable at <code>/coggeo</code>. Start the demo server on port 3000 or set <code>COGGEO_BACKEND_URL</code>.
        </div>
      )}
      <div>
        <h2 style={{ margin: 0 }}>Cognitive Weather Radar</h2>
        <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
          Narrative dynamics across H3 terrain cells with click-to-explain.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          background: "#fff",
        }}
      >
        <NarrativePicker narratives={narratives} value={narrativeId} onChange={setNarrativeId} />

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Range</span>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="6h">6h</option>
            <option value="24h">24h</option>
            <option value="7d">7d</option>
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Bucket</span>
          <select value={tsBucket} onChange={(e) => setTsBucket(e.target.value)}>
            <option value={DEFAULT_TS_BUCKET}>{DEFAULT_TS_BUCKET}</option>
          </select>
        </label>

        <LayerToggles enabled={layers} onToggle={onToggle} />
      </div>

      <div style={{ position: "relative", minHeight: 560 }}>
        <MapboxTerrainLayer
          mapboxToken={(globalThis as any)?.process?.env?.NEXT_PUBLIC_MAPBOX_TOKEN || (import.meta as any)?.env?.VITE_MAPBOX_TOKEN || ""}
          narrativeId={narrativeId}
          tsBucket={tsBucket}
          layer={activeLayer}
          onExplain={openExplain}
          onHoverFeature={setHoverFeature}
        />

        <div style={{ position: "absolute", left: 12, top: 12, zIndex: 2 }}>
          <CogGeoLegend layer={activeLayer} />
        </div>

        <div style={{ position: "absolute", right: drawerOpen ? 440 : 12, top: 12, zIndex: 2 }}>
          <HoverCard feature={hoverFeature} />
        </div>

        <ExplainDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          payload={explainPayload}
          loading={explainLoading}
          error={explainError}
        />
      </div>
    </div>
  );
}
INNER_EOF
