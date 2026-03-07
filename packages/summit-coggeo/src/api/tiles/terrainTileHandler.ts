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

    const q = { narrativeId, tsBucket, layer, format: (wantsMVT(req) ? "mvt" : "geojson") as "mvt" | "geojson" };

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
