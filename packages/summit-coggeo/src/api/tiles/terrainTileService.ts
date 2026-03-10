<<<<<<< HEAD
import type { TerrainLayerKind, TerrainTileQuery } from "./contracts.js";
import { tileToBBoxWgs84 } from "./mercator.js";
import { h3ToPolygon, polygonIntersectsBBox } from "./h3geom.js";
// @ts-ignore
import geojsonvt from "geojson-vt";
// @ts-ignore
=======
import type { TerrainLayerKind, TerrainTileQuery } from "./contracts";
import { tileToBBoxWgs84 } from "./mercator";
import { h3ToPolygon, polygonIntersectsBBox } from "./h3geom";
import geojsonvt from "geojson-vt";
>>>>>>> origin/main
import vtpbf from "vt-pbf";

export interface TerrainCellRow {
  id: string;
  ts_bucket: string;
  h3: string;
  narrative_id: string;
  pressure: number;
  temperature: number;
  wind_u: number;
  wind_v: number;
  turbulence: number;
  storm_score: number;
}

export interface TerrainCellStore {
<<<<<<< HEAD
=======
  /**
   * Retrieve cells for (tsBucket,narrativeId) with optional coarse filtering.
   * In a real impl, do bbox filtering in the query (e.g., precomputed h3->bbox).
   */
>>>>>>> origin/main
  listCells(args: { tsBucket: string; narrativeId: string }): Promise<TerrainCellRow[]>;
}

export type GeoJsonFeature = {
  type: "Feature";
  id?: string;
  geometry: any;
  properties: Record<string, any>;
};

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

function valueForLayer(cell: TerrainCellRow, layer: TerrainLayerKind): number | [number, number] {
  switch (layer) {
    case "pressure": return cell.pressure;
    case "temperature": return cell.temperature;
    case "storm": return cell.storm_score;
    case "wind": return [cell.wind_u, cell.wind_v];
    case "turbulence": return cell.turbulence;
  }
}

export async function buildTerrainTileGeoJSON(args: {
  z: number; x: number; y: number;
  q: TerrainTileQuery;
  store: TerrainCellStore;
  maxFeatures?: number;
}): Promise<{ meta: any; geojson: GeoJsonFeatureCollection }> {
  const { z, x, y, q, store } = args;
  const bbox = tileToBBoxWgs84(z, x, y);

  const rows = await store.listCells({ tsBucket: q.tsBucket, narrativeId: q.narrativeId });

  const features: GeoJsonFeature[] = [];
  for (const cell of rows) {
    const poly = h3ToPolygon(cell.h3);
    if (!polygonIntersectsBBox(poly, bbox)) continue;

    features.push({
      type: "Feature",
      id: cell.id,
      geometry: poly,
      properties: {
        id: cell.id,
<<<<<<< HEAD
        explain_id: `explain:\${cell.id}`,
=======
>>>>>>> origin/main
        h3: cell.h3,
        narrative_id: cell.narrative_id,
        ts_bucket: cell.ts_bucket,
        layer: q.layer,
        value: valueForLayer(cell, q.layer),
        pressure: cell.pressure,
        temperature: cell.temperature,
        turbulence: cell.turbulence,
        storm_score: cell.storm_score,
<<<<<<< HEAD
=======
        explain_id: `explain:${cell.id}`, // <- important for click-to-explain
>>>>>>> origin/main
      },
    });

    if ((args.maxFeatures ?? 5000) && features.length >= (args.maxFeatures ?? 5000)) break;
  }

  return {
    meta: {
      z, x, y,
      narrativeId: q.narrativeId,
      tsBucket: q.tsBucket,
      layer: q.layer,
      featureCount: features.length,
      format: "geojson",
    },
    geojson: { type: "FeatureCollection", features },
  };
}

export async function buildTerrainTileMVT(args: {
  z: number; x: number; y: number;
  q: TerrainTileQuery;
  store: TerrainCellStore;
}): Promise<{ meta: any; mvt: Buffer } | null> {
<<<<<<< HEAD
=======
  // Build GeoJSON first (single source of truth), then encode to MVT
>>>>>>> origin/main
  const { meta, geojson } = await buildTerrainTileGeoJSON({
    z: args.z,
    x: args.x,
    y: args.y,
    q: args.q,
    store: args.store,
    maxFeatures: 5000,
  });

<<<<<<< HEAD
=======
  // geojson-vt builds a tile index for slicing/encoding
>>>>>>> origin/main
  const tileIndex = geojsonvt(geojson as any, {
    maxZoom: 14,
    indexMaxZoom: 5,
    indexMaxPoints: 100000,
    extent: 4096,
    buffer: 64,
  });

  const tile = tileIndex.getTile(args.z, args.x, args.y);
  if (!tile || !tile.features || tile.features.length === 0) {
    return { meta: { ...meta, featureCount: 0, format: "mvt" }, mvt: Buffer.from([]) };
  }

<<<<<<< HEAD
=======
  // Encode to MVT
>>>>>>> origin/main
  const layers = {
    terrain: tile,
  };

  const mvtBuf = Buffer.from(vtpbf.fromGeojsonVt(layers, { version: 2 }) as any);

  return {
    meta: { ...meta, featureCount: tile.features.length, format: "mvt" },
    mvt: mvtBuf,
  };
}
