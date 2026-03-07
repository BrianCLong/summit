cat << 'INNER_EOF' > packages/summit-coggeo/src/api/tiles/contracts.ts
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
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/api/tiles/mercator.ts
export interface BBoxWgs84 { west: number; south: number; east: number; north: number; }

export function tileToBBoxWgs84(z: number, x: number, y: number): BBoxWgs84 {
  const n = Math.pow(2, z);
  const lon1 = (x / n) * 360 - 180;
  const lon2 = ((x + 1) / n) * 360 - 180;

  const lat1 = rad2deg(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))));
  const lat2 = rad2deg(Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))));

  return {
    west: lon1,
    south: lat2,
    east: lon2,
    north: lat1,
  };
}

function rad2deg(r: number) { return (r * 180) / Math.PI; }
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/api/tiles/h3geom.ts
import { cellToBoundary } from "h3-js";

export type GeoJsonPosition = [number, number]; // [lon, lat]
export type GeoJsonPolygon = { type: "Polygon"; coordinates: GeoJsonPosition[][] };

export function h3ToPolygon(h3: string): GeoJsonPolygon {
  const boundary = cellToBoundary(h3, true) as Array<[number, number]>; // [lat, lon]
  const ring: GeoJsonPosition[] = boundary.map(([lat, lon]) => [lon, lat]);

  if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return { type: "Polygon", coordinates: [ring] };
}

export function polygonIntersectsBBox(poly: GeoJsonPolygon, bbox: { west: number; south: number; east: number; north: number }): boolean {
  const ring = poly.coordinates[0] || [];
  if (ring.length === 0) return false;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }

  const overlap =
    minLon <= bbox.east &&
    maxLon >= bbox.west &&
    minLat <= bbox.north &&
    maxLat >= bbox.south;

  return overlap;
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/api/tiles/terrainTileService.ts
import type { TerrainLayerKind, TerrainTileQuery } from "./contracts.js";
import { tileToBBoxWgs84 } from "./mercator.js";
import { h3ToPolygon, polygonIntersectsBBox } from "./h3geom.js";
import geojsonvt from "geojson-vt";
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
        explain_id: \`explain:\${cell.id}\`,
        h3: cell.h3,
        narrative_id: cell.narrative_id,
        ts_bucket: cell.ts_bucket,
        layer: q.layer,
        value: valueForLayer(cell, q.layer),
        pressure: cell.pressure,
        temperature: cell.temperature,
        turbulence: cell.turbulence,
        storm_score: cell.storm_score,
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
  const { meta, geojson } = await buildTerrainTileGeoJSON({
    z: args.z,
    x: args.x,
    y: args.y,
    q: args.q,
    store: args.store,
    maxFeatures: 5000,
  });

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

  const layers = {
    terrain: tile,
  };

  const mvtBuf = Buffer.from(vtpbf.fromGeojsonVt(layers, { version: 2 }) as any);

  return {
    meta: { ...meta, featureCount: tile.features.length, format: "mvt" },
    mvt: mvtBuf,
  };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/api/tiles/terrainTileHandler.ts
import type { TerrainCellStore } from "./terrainTileService.js";
import { buildTerrainTileGeoJSON, buildTerrainTileMVT } from "./terrainTileService.js";
import type { TerrainLayerKind } from "./contracts.js";

function wantsMVT(req: any): boolean {
  const q = String(req.query?.format ?? "").toLowerCase();
  if (q === "mvt") return true;
  const accept = String(req.headers?.accept ?? "");
  return accept.includes("application/vnd.mapbox-vector-tile");
}

export function createTerrainTileHandler(store: TerrainCellStore) {
  return async function terrainTileHandler(req: any, res: any) {
    const z = Number(req.params.z);
    const x = Number(req.params.x);
    const y = Number(req.params.y);

    const narrativeId = String(req.query.narrativeId ?? "");
    const tsBucket = String(req.query.tsBucket ?? "");
    const layer = String(req.query.layer ?? "") as TerrainLayerKind;

    if (!z && z !== 0) return res.status(400).json({ error: "missing z" });
    if (!narrativeId || !tsBucket || !layer) return res.status(400).json({ error: "missing narrativeId/tsBucket/layer" });

    const q = { narrativeId, tsBucket, layer, format: wantsMVT(req) ? "mvt" : "geojson" as const };

    if (wantsMVT(req)) {
      const mvt = await buildTerrainTileMVT({ z, x, y, q, store });
      if (mvt) {
        res.setHeader("Content-Type", "application/vnd.mapbox-vector-tile");
        res.setHeader("X-Summit-Tile-Meta", JSON.stringify(mvt.meta));
        return res.status(200).send(mvt.mvt);
      }
    }

    const out = await buildTerrainTileGeoJSON({ z, x, y, q, store, maxFeatures: 5000 });
    res.setHeader("Content-Type", "application/geo+json");
    res.setHeader("X-Summit-Tile-Meta", JSON.stringify(out.meta));
    return res.status(200).json(out.geojson);
  };
}
INNER_EOF
