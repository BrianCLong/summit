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
