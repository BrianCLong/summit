import React, { useEffect, useMemo, useState } from "react";
import { fetchCompatibility, fetchDiffusionGeoJson, fetchDiffusionMap, fetchLinguisticAnomaly } from "../lib/culturalApi";
import { CompatibilityPanel } from "../components/cognitive/CompatibilityPanel";
import { DiffusionHeatmap } from "../components/cognitive/DiffusionHeatmap";
import { ExplainDrawer } from "../components/cognitive/ExplainDrawer";
import { LinguisticAnomalyPanel } from "../components/cognitive/LinguisticAnomalyPanel";
import { NarrativeControls } from "../components/cognitive/NarrativeControls";
import type {
  CompatibilityBreakdown,
  DiffusionGeoJson,
  DiffusionMap,
  LinguisticFingerprint
} from "../types/cultural";

const DEFAULT_NARRATIVE_ID = "nar-energy-sanctions";

export default function CognitiveBattlespacePage() {
  const [narrativeId, setNarrativeId] = useState(DEFAULT_NARRATIVE_ID);
  const [timeBucket, setTimeBucket] = useState("7d");
  const [diffusionMap, setDiffusionMap] = useState<DiffusionMap | null>(null);
  const [diffusionGeoJson, setDiffusionGeoJson] = useState<DiffusionGeoJson | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityBreakdown | null>(null);
  const [anomaly, setAnomaly] = useState<LinguisticFingerprint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [diffusion, geojson, ling] = await Promise.all([
          fetchDiffusionMap(narrativeId),
          fetchDiffusionGeoJson(narrativeId),
          fetchLinguisticAnomaly(narrativeId)
        ]);
        setDiffusionMap(diffusion);
        setDiffusionGeoJson(geojson);
        setAnomaly(ling);

        const defaultPopulationId = diffusion.points[0]?.populationId;
        if (defaultPopulationId) {
          setCompatibility(await fetchCompatibility(defaultPopulationId, narrativeId));
        } else {
          setCompatibility(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [narrativeId, timeBucket]);

  const explanation = useMemo(
    () => [...(compatibility?.explanation ?? []), ...(anomaly?.reasons ?? [])],
    [compatibility, anomaly]
  );

  async function handleSelectRegion(regionId: string) {
    const point = diffusionMap?.points.find((p) => p.regionId === regionId);
    if (!point) return;
    setIsLoading(true);
    try {
      setCompatibility(await fetchCompatibility(point.populationId, narrativeId));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6" aria-busy={isLoading}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Cognitive Battlespace</h1>
            {isLoading && (
              <div
                role="status"
                aria-label="Loading data"
                className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Narrative diffusion, cultural compatibility, and linguistic anomaly detection.
          </p>
        </div>
      </div>

      <NarrativeControls
        narrativeId={narrativeId}
        onNarrativeIdChange={setNarrativeId}
        timeBucket={timeBucket}
        onTimeBucketChange={setTimeBucket}
        isLoading={isLoading}
      />

      {error ? <div className="rounded-2xl border border-red-500 p-4 text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DiffusionHeatmap data={diffusionGeoJson} onSelectRegion={handleSelectRegion} />
        <CompatibilityPanel data={compatibility} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LinguisticAnomalyPanel data={anomaly} />
        <ExplainDrawer title="Explain" explanation={explanation} />
      </div>
    </div>
  );
}
