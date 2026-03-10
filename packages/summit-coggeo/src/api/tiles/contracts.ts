export type TerrainLayerKind = "pressure" | "temperature" | "storm" | "wind" | "turbulence";

export interface TerrainTileQuery {
  narrativeId: string;
<<<<<<< HEAD
  tsBucket: string;
=======
  tsBucket: string; // e.g. "hourly:2026-03-05T07" or your bucket key
>>>>>>> origin/main
  layer: TerrainLayerKind;
  format?: "mvt" | "geojson";
}

<<<<<<< HEAD
=======
/**
 * Tile endpoint contract:
 * GET /coggeo/terrain/tiles/:z/:x/:y?narrativeId=...&tsBucket=...&layer=...&format=mvt|geojson
 *
 * Content negotiation:
 * - If format=mvt OR Accept includes "application/vnd.mapbox-vector-tile": return MVT (if enabled)
 * - Else return GeoJSON FeatureCollection (fallback)
 */
>>>>>>> origin/main
export interface TerrainTileResponseMeta {
  z: number; x: number; y: number;
  narrativeId: string;
  tsBucket: string;
  layer: TerrainLayerKind;
  featureCount: number;
  format: "mvt" | "geojson";
}
