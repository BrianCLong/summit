cat << 'INNER_EOF' > packages/summit-coggeo/src/graph/intelGraphClient.ts
export interface GraphEdge {
  type: string;
  from: string;
  to: string;
  data?: Record<string, unknown>;
}

export interface GraphNode<T = any> {
  id: string;
  type: string;
  data: T;
}

export interface IntelGraphClient {
  getNode<T = any>(id: string): Promise<GraphNode<T> | null>;
  getNodeBatch<T = any>(ids: string[]): Promise<Array<GraphNode<T>>>;
  getOutgoingEdges(from: string, type?: string): Promise<GraphEdge[]>;
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/graph/explainTraversal.ts
import type { IntelGraphClient } from "./intelGraphClient.js";
import type { ExplainPayload } from "../api/types.js";

type StormEvent = {
  id: string;
  narrative_id: string;
  start_ts: string;
  end_ts: string | null;
  severity: number;
  cells: string[];
  explain_ref: string;
};

type TerrainCell = {
  id: string;
  ts_bucket: string;
  h3: string;
  narrative_id: string;
  pressure: number;
  temperature: number;
  turbulence: number;
  storm_score: number;
};

type Observation = {
  id: string;
  ts: string;
  source: string;
  url?: string | null;
  content: string;
};

function topK<T>(arr: T[], k: number, score: (t: T) => number): T[] {
  return arr
    .map((t) => ({ t, s: score(t) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.t);
}

export async function buildExplainForStorm(args: {
  stormId: string;
  graph: IntelGraphClient;
}): Promise<ExplainPayload> {
  const stormNode = await args.graph.getNode<StormEvent>(args.stormId);
  if (!stormNode) {
    return {
      id: \`explain:\${args.stormId}\`,
      kind: "storm",
      summary: \`Storm not found: \${args.stormId}\`,
      drivers: [],
      confidence: 0.01,
      provenance: { models: ["explainTraversal:v1"] },
    };
  }
  const storm = stormNode.data;

  const cellIds: string[] = storm.cells ?? [];
  const cellNodes = await args.graph.getNodeBatch<TerrainCell>(cellIds);
  const cells = cellNodes.map((n) => n.data);

  const obsIds = new Set<string>();
  for (const cid of topK(cellIds, 20, (id) => {
    const c = cells.find((x) => x.id === id);
    return c ? c.storm_score : 0;
  })) {
    const edges = await args.graph.getOutgoingEdges(cid, "CELL_SUPPORTED_BY_OBS");
    for (const e of edges) obsIds.add(e.to);
  }
  const obsNodes = obsIds.size ? await args.graph.getNodeBatch<Observation>(Array.from(obsIds).slice(0, 50)) : [];
  const observations = obsNodes.map((n) => n.data);

  const maxPressure = cells.reduce((m, c) => Math.max(m, c.pressure ?? 0), 0);
  const maxTemp = cells.reduce((m, c) => Math.max(m, c.temperature ?? 0), 0);
  const maxTurb = cells.reduce((m, c) => Math.max(m, c.turbulence ?? 0), 0);

  const drivers: ExplainPayload["drivers"] = [
    {
      name: "Pressure spike",
      delta: maxPressure,
      evidence: topK(cells, 5, (c) => c.pressure).map((c) => c.id),
    },
    {
      name: "Emotional temperature",
      delta: maxTemp,
      evidence: topK(cells, 5, (c) => c.temperature).map((c) => c.id),
    },
    {
      name: "Turbulence / contradiction",
      delta: maxTurb,
      evidence: topK(cells, 5, (c) => c.turbulence).map((c) => c.id),
    },
  ].filter((d) => Number.isFinite(d.delta));

  const evidenceObs = observations.slice(0, 10).map((o) => o.id);

  return {
    id: storm.explain_ref || \`explain:\${storm.id}\`,
    kind: "storm",
    summary: \`Storm detected for \${storm.narrative_id} with severity \${storm.severity.toFixed(2)} across \${cells.length} cells.\`,
    drivers,
    top_narratives: [
      { narrative_id: storm.narrative_id, role: "storm_narrative", evidence: evidenceObs },
    ],
    confidence: Math.max(0.05, storm.severity),
    provenance: { models: ["explainTraversal:v1"] },
  };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/storage/duckdb/duckdbClient.ts
import duckdb from "duckdb";

export interface DuckDBClient {
  db: duckdb.Database;
  connect(): Promise<duckdb.Connection>;
  close(): Promise<void>;
}

export function createDuckDBClient(opts: { path: string }): DuckDBClient {
  const db = new duckdb.Database(opts.path);

  return {
    db,
    async connect() {
      return new Promise((resolve, reject) => {
        db.connect((err: any, conn: duckdb.Connection) => {
          if (err) return reject(err);
          resolve(conn);
        });
      });
    },
    async close() {
      return;
    },
  };
}

export async function run(conn: duckdb.Connection, sql: string, params: any[] = []): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    conn.run(sql, params, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function all<T = any>(conn: duckdb.Connection, sql: string, params: any[] = []): Promise<T[]> {
  return await new Promise<T[]>((resolve, reject) => {
    conn.all(sql, params, (err: any, rows: T[]) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/storage/duckdb/coggeoDuckStore.ts
import type duckdb from "duckdb";
import { all, run } from "./duckdbClient.js";
import type { TerrainCellRow } from "../../api/tiles/terrainTileService.js";
import type { ExplainPayload } from "../../api/types.js";

export interface NarrativeRow {
  id: string;
  title: string;
  summary: string;
  first_seen: string;
  last_seen: string;
  confidence: number;
}

export interface StormRow {
  id: string;
  narrative_id: string;
  start_ts: string;
  end_ts: string | null;
  severity: number;
  explain_ref: string;
}

export class CogGeoDuckStore {
  constructor(
    private conn: duckdb.Connection,
    private opts: { parquetPath: string },
  ) {}

  async init(): Promise<void> {
    await run(this.conn, \`
      CREATE TABLE IF NOT EXISTS terrain_cells (
        id VARCHAR,
        ts_bucket VARCHAR,
        h3 VARCHAR,
        narrative_id VARCHAR,
        pressure DOUBLE,
        temperature DOUBLE,
        wind_u DOUBLE,
        wind_v DOUBLE,
        turbulence DOUBLE,
        storm_score DOUBLE
      );
    \`);

    await run(this.conn, \`
      CREATE TABLE IF NOT EXISTS coggeo_narratives (
        id VARCHAR,
        title VARCHAR,
        summary VARCHAR,
        first_seen VARCHAR,
        last_seen VARCHAR,
        confidence DOUBLE
      );
    \`);

    await run(this.conn, \`
      CREATE TABLE IF NOT EXISTS coggeo_storms (
        id VARCHAR,
        narrative_id VARCHAR,
        start_ts VARCHAR,
        end_ts VARCHAR,
        severity DOUBLE,
        explain_ref VARCHAR
      );
    \`);

    await run(this.conn, \`
      CREATE TABLE IF NOT EXISTS coggeo_explains (
        id VARCHAR,
        kind VARCHAR,
        payload_json VARCHAR
      );
    \`);

    await run(this.conn, \`
      CREATE TABLE IF NOT EXISTS coggeo_cell_obs (
        cell_id VARCHAR,
        obs_id VARCHAR
      );
    \`);

    await run(this.conn, \`
      CREATE TEMP VIEW IF NOT EXISTS _parquet_cells AS
      SELECT * FROM read_parquet('\${this.opts.parquetPath}');
    \`).catch(() => {});

    await run(this.conn, \`
      INSERT INTO terrain_cells
      SELECT * FROM _parquet_cells;
    \`).catch(() => {});
  }

  async upsertTerrain(cells: TerrainCellRow[]): Promise<void> {
    for (const c of cells) {
      await run(this.conn, \`DELETE FROM terrain_cells WHERE id = ?\`, [c.id]);
      await run(this.conn, \`INSERT INTO terrain_cells VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`, [
        c.id, c.ts_bucket, c.h3, c.narrative_id, c.pressure, c.temperature, c.wind_u, c.wind_v, c.turbulence, c.storm_score,
      ]);
    }
  }

  async exportTerrainToParquet(): Promise<void> {
    await run(this.conn, \`
      COPY (SELECT * FROM terrain_cells) TO '\${this.opts.parquetPath}' (FORMAT PARQUET);
    \`);
  }

  async listTerrain(args: { tsBucket: string; narrativeId: string }): Promise<TerrainCellRow[]> {
    return await all<TerrainCellRow>(this.conn, \`
      SELECT * FROM terrain_cells
      WHERE ts_bucket = ? AND narrative_id = ?
    \`, [args.tsBucket, args.narrativeId]);
  }

  async upsertNarratives(rows: NarrativeRow[]): Promise<void> {
    for (const r of rows) {
      await run(this.conn, \`DELETE FROM coggeo_narratives WHERE id = ?\`, [r.id]);
      await run(this.conn, \`INSERT INTO coggeo_narratives VALUES (?, ?, ?, ?, ?, ?)\`, [
        r.id, r.title, r.summary, r.first_seen, r.last_seen, r.confidence,
      ]);
    }
  }

  async listNarratives(): Promise<Array<{ id: string; title: string }>> {
    return await all(this.conn, \`SELECT id, title FROM coggeo_narratives ORDER BY last_seen DESC LIMIT 200\`);
  }

  async upsertStorms(rows: StormRow[]): Promise<void> {
    for (const r of rows) {
      await run(this.conn, \`DELETE FROM coggeo_storms WHERE id = ?\`, [r.id]);
      await run(this.conn, \`INSERT INTO coggeo_storms VALUES (?, ?, ?, ?, ?, ?)\`, [
        r.id, r.narrative_id, r.start_ts, r.end_ts, r.severity, r.explain_ref,
      ]);
    }
  }

  async listStorms(args: { timeRange: string; narrativeId?: string }): Promise<StormRow[]> {
    if (args.narrativeId) {
      return await all(this.conn, \`
        SELECT * FROM coggeo_storms WHERE narrative_id = ? ORDER BY start_ts DESC LIMIT 200
      \`, [args.narrativeId]);
    }
    return await all(this.conn, \`SELECT * FROM coggeo_storms ORDER BY start_ts DESC LIMIT 200\`);
  }

  async upsertExplains(explains: ExplainPayload[]): Promise<void> {
    for (const e of explains) {
      await run(this.conn, \`DELETE FROM coggeo_explains WHERE id = ?\`, [e.id]);
      await run(this.conn, \`INSERT INTO coggeo_explains VALUES (?, ?, ?)\`, [
        e.id, e.kind, JSON.stringify(e),
      ]);
    }
  }

  async getExplain(id: string): Promise<ExplainPayload | null> {
    const rows = await all<{ payload_json: string }>(this.conn, \`
      SELECT payload_json FROM coggeo_explains WHERE id = ? LIMIT 1
    \`, [id]);
    if (rows.length === 0) return null;
    return JSON.parse(rows[0]!.payload_json);
  }

  async linkCellToObs(cellId: string, obsIds: string[]): Promise<void> {
    await run(this.conn, \`DELETE FROM coggeo_cell_obs WHERE cell_id = ?\`, [cellId]);
    for (const obsId of obsIds) {
      await run(this.conn, \`INSERT INTO coggeo_cell_obs VALUES (?, ?)\`, [cellId, obsId]);
    }
  }

  async listObsForCell(cellId: string): Promise<string[]> {
    const rows = await all<{ obs_id: string }>(this.conn, \`
      SELECT obs_id FROM coggeo_cell_obs WHERE cell_id = ? LIMIT 200
    \`, [cellId]);
    return rows.map(r => r.obs_id);
  }

  async getCell(cellId: string): Promise<TerrainCellRow | null> {
    const rows = await all<TerrainCellRow>(this.conn, \`SELECT * FROM terrain_cells WHERE id = ? LIMIT 1\`, [cellId]);
    return rows[0] ?? null;
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/storage/duckdb/parquetTerrainCellStore.ts
import type duckdb from "duckdb";
import { CogGeoDuckStore } from "./coggeoDuckStore.js";
import type { TerrainCellRow } from "../../api/tiles/terrainTileService.js";

export interface ParquetTerrainCellStoreOpts {
  parquetPath: string;
}

export class ParquetTerrainCellStore {
  private store: CogGeoDuckStore;

  constructor(conn: duckdb.Connection, opts: ParquetTerrainCellStoreOpts) {
    this.store = new CogGeoDuckStore(conn, opts);
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async upsertCells(cells: TerrainCellRow[]): Promise<void> {
    await this.store.upsertTerrain(cells);
  }

  async exportToParquet(): Promise<void> {
    await this.store.exportTerrainToParquet();
  }

  async listCells(args: { tsBucket: string; narrativeId: string }): Promise<TerrainCellRow[]> {
    return this.store.listTerrain(args);
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/api/coggeoDuckHandlers.ts
import type { CogGeoDuckStore } from "../storage/duckdb/coggeoDuckStore.js";

export function createNarrativesHandler(store: CogGeoDuckStore) {
  return async function narrativesHandler(_req: any, res: any) {
    const rows = await store.listNarratives();
    return res.status(200).json(rows);
  };
}

export function createStormsHandler(store: CogGeoDuckStore) {
  return async function stormsHandler(req: any, res: any) {
    const timeRange = String(req.query.timeRange ?? "24h");
    const narrativeId = req.query.narrativeId ? String(req.query.narrativeId) : undefined;

    const rows = await store.listStorms({ timeRange, narrativeId });
    return res.status(200).json(rows);
  };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/api/explain/explainFromDuckdb.ts
import type { CogGeoDuckStore } from "../../storage/duckdb/coggeoDuckStore.js";
import type { ExplainPayload } from "../types.js";

export async function explainForCell(args: { explainId: string; store: CogGeoDuckStore }): Promise<ExplainPayload> {
  const cellId = args.explainId.replace(/^explain:/, "");

  const cell = await args.store.getCell(cellId);
  if (!cell) {
    return {
      id: args.explainId,
      kind: "terrain",
      summary: \`Cell not found: \${cellId}\`,
      drivers: [],
      confidence: 0.01,
      provenance: { models: ["explainFromDuckdb:v1"] },
    };
  }

  const obsIds = await args.store.listObsForCell(cellId);

  return {
    id: args.explainId,
    kind: "terrain",
    summary: \`Terrain cell \${cell.h3} for narrative \${cell.narrative_id} at \${cell.ts_bucket}.\`,
    drivers: [
      { name: "Pressure", delta: cell.pressure, evidence: [cell.id, ...obsIds.slice(0, 10)] },
      { name: "Temperature", delta: cell.temperature, evidence: [cell.id, ...obsIds.slice(0, 10)] },
      { name: "Storm score", delta: cell.storm_score, evidence: [cell.id, ...obsIds.slice(0, 10)] },
      { name: "Turbulence", delta: cell.turbulence, evidence: [cell.id, ...obsIds.slice(0, 10)] },
    ],
    confidence: Math.min(1, Math.max(0.05, cell.storm_score)),
    provenance: { models: ["explainFromDuckdb:v1"] },
  };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/api/explain/explainDuckHandler.ts
import type { CogGeoDuckStore } from "../../storage/duckdb/coggeoDuckStore.js";
import { explainForCell } from "./explainFromDuckdb.js";

export function createExplainDuckHandler(store: CogGeoDuckStore) {
  return async function explainHandler(req: any, res: any) {
    const explainId = String(req.params.explainId ?? "");
    if (!explainId) return res.status(400).json({ error: "missing explainId" });

    const existing = await store.getExplain(explainId);
    if (existing) return res.status(200).json(existing);

    const payload = await explainForCell({ explainId, store });
    return res.status(200).json(payload);
  };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/index.ts
export * from "./ingest/normalizeObservation.js";
export * from "./extract/extractSignals.js";
export * from "./features/clusterNarratives.js";
export * from "./features/computeTerrain.js";
export * from "./models/stormDetector.js";
export * from "./graph/buildCogGeoWriteSet.js";
// export * from "./graph/writeCogGeoArtifacts.js";
// export * from "./api/coggeoRouter.js";
export * from "./api/types.js";
INNER_EOF
