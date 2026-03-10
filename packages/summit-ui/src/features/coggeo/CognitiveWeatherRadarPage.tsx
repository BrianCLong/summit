import React, { useEffect, useMemo, useState } from "react";
<<<<<<< HEAD
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
=======
import { useCogGeoApi } from "./hooks/useCogGeoApi";
import { NarrativePicker } from "./components/NarrativePicker";
import { LayerToggles, type LayerKind } from "./components/LayerToggles";
import { ExplainDrawer } from "./components/ExplainDrawer";
import { MapboxTerrainLayer } from "./components/MapboxTerrainLayer";

export function CognitiveWeatherRadarPage() {
  const api = useCogGeoApi("/api");

  const [narratives, setNarratives] = useState<Array<{ id: string; title: string }>>([]);
  const [narrativeId, setNarrativeId] = useState<string>("nar:stub");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [tsBucket, setTsBucket] = useState<string>("hourly");

  const [layers, setLayers] = useState<Record<LayerKind, boolean>>({
    pressure: true,
    temperature: true,
>>>>>>> origin/main
    storm: true,
    wind: false,
    turbulence: false,
  });

<<<<<<< HEAD
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainPayload, setExplainPayload] = useState<ExplainPayload | null>(null);
=======
  const [storms, setStorms] = useState<Array<{ id: string; severity: number; explain_ref: string }>>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explainId, setExplainId] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainPayload, setExplainPayload] = useState<any>(null);
>>>>>>> origin/main

  const [hoverFeature, setHoverFeature] = useState<HoverFeatureSummary | null>(null);

  const [backendStatus, setBackendStatus] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
<<<<<<< HEAD
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
=======
    api.listNarratives()
      .then((ns) => {
        setNarratives(ns);
        if (ns.length > 0) setNarrativeId(ns[0]!.id);
      })
      .catch((e) => {
        // keep stub
        console.error(e);
        setNarratives([{ id: "nar:stub", title: "Stub narrative" }]);
      });
  }, [api]);

  useEffect(() => {
    api.listStorms({ timeRange, narrativeId })
      .then(setStorms)
      .catch((e) => {
        console.error(e);
        setStorms([]);
      });
  }, [api, timeRange, narrativeId]);

  const onToggle = (k: LayerKind) => setLayers((p) => ({ ...p, [k]: !p[k] }));

  const openExplain = async (id: string) => {
    setDrawerOpen(true);
    setExplainId(id);
>>>>>>> origin/main
    setExplainLoading(true);
    setExplainError(null);
    setExplainPayload(null);

    try {
<<<<<<< HEAD
      const payload = await api.getExplain(explainId);
      setExplainPayload(payload);
    } catch (e: any) {
      setExplainError(e?.message ?? "Failed to load explanation");
=======
      const payload = await api.getExplain(id);
      setExplainPayload(payload);
    } catch (e: any) {
      setExplainError(e?.message ?? "Explain fetch failed");
>>>>>>> origin/main
    } finally {
      setExplainLoading(false);
    }
  };

<<<<<<< HEAD
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
=======
  const topBar = useMemo(() => {
    return (
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
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
            <option value="hourly">hourly</option>
            <option value="daily">daily</option>
          </select>
        </label>

        <LayerToggles enabled={layers} onToggle={onToggle} />
      </div>
    );
  }, [narratives, narrativeId, timeRange, tsBucket, layers]);

  return (
    <div style={{ position: "relative", padding: 16 }}>
      <h2>Cognitive Weather Radar</h2>
      {topBar}

      <div style={{ marginTop: 12 }}>
        <MapboxTerrainLayer
          mapboxToken={(import.meta as any).env?.VITE_MAPBOX_TOKEN ?? ""}
          narrativeId={narrativeId}
          tsBucket={tsBucket}
          layers={layers}
          onExplain={openExplain}
        />
      </div>

      <ExplainDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        payload={explainPayload}
        loading={explainLoading}
        error={explainError}
      />

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        TODO: connect map click events to feature IDs → /coggeo/explain/:id
      </div>
>>>>>>> origin/main
    </div>
  );
}
