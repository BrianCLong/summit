import type {
  CompatibilityBreakdown,
  DiffusionMap,
  DiffusionGeoJson,
  LinguisticFingerprint
} from "../types/cultural";

export async function fetchDiffusionMap(narrativeId: string): Promise<DiffusionMap> {
  const res = await fetch(`/api/cultural/diffusion/${encodeURIComponent(narrativeId)}`);
  if (!res.ok) throw new Error("Failed to fetch diffusion map");
  return res.json();
}

export async function fetchDiffusionGeoJson(narrativeId: string): Promise<DiffusionGeoJson> {
  const res = await fetch(`/api/cultural/diffusion/${encodeURIComponent(narrativeId)}/geojson`);
  if (!res.ok) throw new Error("Failed to fetch diffusion GeoJSON");
  return res.json();
}

export async function fetchCompatibility(
  populationId: string,
  narrativeId: string
): Promise<CompatibilityBreakdown> {
  const res = await fetch(
    `/api/cultural/compatibility?populationId=${encodeURIComponent(populationId)}&narrativeId=${encodeURIComponent(narrativeId)}`
  );
  if (!res.ok) throw new Error("Failed to fetch compatibility");
  return res.json();
}

export async function fetchLinguisticAnomaly(narrativeId: string): Promise<LinguisticFingerprint> {
  const res = await fetch(`/api/cultural/linguistic/${encodeURIComponent(narrativeId)}`);
  if (!res.ok) throw new Error("Failed to fetch linguistic anomaly");
  return res.json();
}
