export type TerrainLayerKind = "pressure" | "temperature" | "storm" | "wind" | "turbulence";

export interface TerrainTileQuery {
  narrativeId: string;
  tsBucket: string;
  layer: TerrainLayerKind;
  format?: "mvt" | "geojson";
}

export interface TerrainTileResponseMeta {
  z: number; x: number; y: number;
  narrativeId: string;
  tsBucket: string;
  layer: TerrainLayerKind;
  featureCount: number;
  format: "mvt" | "geojson";
}
