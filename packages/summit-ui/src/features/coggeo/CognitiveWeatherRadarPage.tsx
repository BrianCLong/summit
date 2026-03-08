import { useEffect, useState } from "react";
import type { ExplainPayload, Narrative, TerrainCell } from "./types";
import { ExplainDrawer } from "./components/ExplainDrawer";
import { LayerToggles } from "./components/LayerToggles";
import { MapView } from "./components/MapView";
import { NarrativePicker } from "./components/NarrativePicker";
import { useCogGeoApi } from "./hooks/useCogGeoApi";

const DEFAULT_LAYERS: Record<string, boolean> = {
  pressure: true,
  temperature: true,
  storms: true,
  winds: false,
};

export function CognitiveWeatherRadarPage() {
  const api = useCogGeoApi();
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [cells, setCells] = useState<TerrainCell[]>([]);
  const [selectedNarrativeId, setSelectedNarrativeId] = useState<string | null>(null);
  const [explainPayload, setExplainPayload] = useState<ExplainPayload | null>(null);

  useEffect(() => {
    void api.getNarratives().then(setNarratives);
    void api.getTerrain().then(setCells);
  }, [api]);

  useEffect(() => {
    if (!selectedNarrativeId) {
      setExplainPayload(null);
      return;
    }
    void api.explain(selectedNarrativeId).then(setExplainPayload);
  }, [api, selectedNarrativeId]);

  const toggleLayer = (layer: string) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <main>
      <h2>Summit Cognitive Weather Radar</h2>
      <LayerToggles layers={layers} onToggle={toggleLayer} />
      <NarrativePicker
        narratives={narratives}
        selected={selectedNarrativeId}
        onSelect={setSelectedNarrativeId}
      />
      <MapView cells={cells} />
      <ExplainDrawer payload={explainPayload} />
    </main>
  );
}
