import React, { useEffect, useMemo, useState } from "react";
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
    storm: true,
    wind: false,
    turbulence: false,
  });

  const [storms, setStorms] = useState<Array<{ id: string; severity: number; explain_ref: string }>>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explainId, setExplainId] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainPayload, setExplainPayload] = useState<any>(null);

  useEffect(() => {
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
    setExplainLoading(true);
    setExplainError(null);
    setExplainPayload(null);

    try {
      const payload = await api.getExplain(id);
      setExplainPayload(payload);
    } catch (e: any) {
      setExplainError(e?.message ?? "Explain fetch failed");
    } finally {
      setExplainLoading(false);
    }
  };

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
    </div>
  );
}
