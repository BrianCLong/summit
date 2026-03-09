import type duckdb from "duckdb";
import { all, run } from "./duckdbClient";
import type { TerrainCellRow } from "../../api/tiles/terrainTileService";
import type { ExplainPayload } from "../../api/types";

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
    // Terrain cells (existing)
    await run(this.conn, `
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
    `);

    // Narratives
    await run(this.conn, `
      CREATE TABLE IF NOT EXISTS coggeo_narratives (
        id VARCHAR,
        title VARCHAR,
        summary VARCHAR,
        first_seen VARCHAR,
        last_seen VARCHAR,
        confidence DOUBLE
      );
    `);

    // Storms
    await run(this.conn, `
      CREATE TABLE IF NOT EXISTS coggeo_storms (
        id VARCHAR,
        narrative_id VARCHAR,
        start_ts VARCHAR,
        end_ts VARCHAR,
        severity DOUBLE,
        explain_ref VARCHAR
      );
    `);

    // Explains
    await run(this.conn, `
      CREATE TABLE IF NOT EXISTS coggeo_explains (
        id VARCHAR,
        kind VARCHAR,
        payload_json VARCHAR
      );
    `);

    // Evidence edges: cell -> obs (for explain)
    await run(this.conn, `
      CREATE TABLE IF NOT EXISTS coggeo_cell_obs (
        cell_id VARCHAR,
        obs_id VARCHAR
      );
    `);

    // Optional parquet load for terrain
    await run(this.conn, `
      CREATE TEMP VIEW IF NOT EXISTS _parquet_cells AS
      SELECT * FROM read_parquet('${this.opts.parquetPath}');
    `).catch(() => {});

    await run(this.conn, `
      INSERT INTO terrain_cells
      SELECT * FROM _parquet_cells;
    `).catch(() => {});
  }

  async upsertTerrain(cells: TerrainCellRow[]): Promise<void> {
    for (const c of cells) {
      await run(this.conn, `DELETE FROM terrain_cells WHERE id = ?`, [c.id]);
      await run(this.conn, `INSERT INTO terrain_cells VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        c.id, c.ts_bucket, c.h3, c.narrative_id, c.pressure, c.temperature, c.wind_u, c.wind_v, c.turbulence, c.storm_score,
      ]);
    }
  }

  async exportTerrainToParquet(): Promise<void> {
    await run(this.conn, `
      COPY (SELECT * FROM terrain_cells) TO '${this.opts.parquetPath}' (FORMAT PARQUET);
    `);
  }

  async listTerrain(args: { tsBucket: string; narrativeId: string }): Promise<TerrainCellRow[]> {
    return await all<TerrainCellRow>(this.conn, `
      SELECT * FROM terrain_cells
      WHERE ts_bucket = ? AND narrative_id = ?
    `, [args.tsBucket, args.narrativeId]);
  }

  async upsertNarratives(rows: NarrativeRow[]): Promise<void> {
    for (const r of rows) {
      await run(this.conn, `DELETE FROM coggeo_narratives WHERE id = ?`, [r.id]);
      await run(this.conn, `INSERT INTO coggeo_narratives VALUES (?, ?, ?, ?, ?, ?)`, [
        r.id, r.title, r.summary, r.first_seen, r.last_seen, r.confidence,
      ]);
    }
  }

  async listNarratives(): Promise<Array<{ id: string; title: string }>> {
    return await all(this.conn, `SELECT id, title FROM coggeo_narratives ORDER BY last_seen DESC LIMIT 200`);
  }

  async upsertStorms(rows: StormRow[]): Promise<void> {
    for (const r of rows) {
      await run(this.conn, `DELETE FROM coggeo_storms WHERE id = ?`, [r.id]);
      await run(this.conn, `INSERT INTO coggeo_storms VALUES (?, ?, ?, ?, ?, ?)`, [
        r.id, r.narrative_id, r.start_ts, r.end_ts, r.severity, r.explain_ref,
      ]);
    }
  }

  async listStorms(args: { timeRange: string; narrativeId?: string }): Promise<StormRow[]> {
    // Minimal: ignore timeRange parsing for now; return recent
    if (args.narrativeId) {
      return await all(this.conn, `
        SELECT * FROM coggeo_storms WHERE narrative_id = ? ORDER BY start_ts DESC LIMIT 200
      `, [args.narrativeId]);
    }
    return await all(this.conn, `SELECT * FROM coggeo_storms ORDER BY start_ts DESC LIMIT 200`);
  }

  async upsertExplains(explains: ExplainPayload[]): Promise<void> {
    for (const e of explains) {
      await run(this.conn, `DELETE FROM coggeo_explains WHERE id = ?`, [e.id]);
      await run(this.conn, `INSERT INTO coggeo_explains VALUES (?, ?, ?)`, [
        e.id, e.kind, JSON.stringify(e),
      ]);
    }
  }

  async getExplain(id: string): Promise<ExplainPayload | null> {
    const rows = await all<{ payload_json: string }>(this.conn, `
      SELECT payload_json FROM coggeo_explains WHERE id = ? LIMIT 1
    `, [id]);
    if (rows.length === 0) return null;
    return JSON.parse(rows[0]!.payload_json);
  }

  async linkCellToObs(cellId: string, obsIds: string[]): Promise<void> {
    // naive: wipe then insert
    await run(this.conn, `DELETE FROM coggeo_cell_obs WHERE cell_id = ?`, [cellId]);
    for (const obsId of obsIds) {
      await run(this.conn, `INSERT INTO coggeo_cell_obs VALUES (?, ?)`, [cellId, obsId]);
    }
  }

  async listObsForCell(cellId: string): Promise<string[]> {
    const rows = await all<{ obs_id: string }>(this.conn, `
      SELECT obs_id FROM coggeo_cell_obs WHERE cell_id = ? LIMIT 200
    `, [cellId]);
    return rows.map(r => r.obs_id);
  }

  async getCell(cellId: string): Promise<TerrainCellRow | null> {
    const rows = await all<TerrainCellRow>(this.conn, `SELECT * FROM terrain_cells WHERE id = ? LIMIT 1`, [cellId]);
    return rows[0] ?? null;
  }
}
