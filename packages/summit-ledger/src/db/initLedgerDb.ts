import fs from "node:fs";
import path from "node:path";

export interface LedgerDbOptions {
  filename?: string;
}

export interface LedgerDbRow {
  writeset_id: string;
  system_time: string;
  source: string;
  actor?: string | null;
  sha256: string;
  json: string;
}

export interface LedgerDbHandle {
  exec(sql: string): Promise<void>;
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  insertWriteSet(row: LedgerDbRow): Promise<void>;
  listWriteSets(): Promise<LedgerDbRow[]>;
}

class InMemoryLedgerDb implements LedgerDbHandle {
  private writesets: LedgerDbRow[] = [];

  async exec(_sql: string): Promise<void> {
    return;
  }

  async all<T = unknown>(_sql: string, _params?: unknown[]): Promise<T[]> {
    return [] as T[];
  }

  async get<T = unknown>(_sql: string, _params?: unknown[]): Promise<T | undefined> {
    return undefined as T | undefined;
  }

  async insertWriteSet(row: LedgerDbRow): Promise<void> {
    const existing = this.writesets.find((w) => w.writeset_id === row.writeset_id);
    if (existing) {
      throw new Error(`writeset already exists: ${row.writeset_id}`);
    }
    this.writesets.push(row);
    this.writesets.sort((a, b) => {
      if (a.system_time === b.system_time) {
        return a.writeset_id.localeCompare(b.writeset_id);
      }
      return a.system_time.localeCompare(b.system_time);
    });
  }

  async listWriteSets(): Promise<LedgerDbRow[]> {
    return [...this.writesets];
  }
}

class JsonFileLedgerDb extends InMemoryLedgerDb {
  constructor(private readonly filename: string) {
    super();
  }

  static async create(filename: string): Promise<JsonFileLedgerDb> {
    const db = new JsonFileLedgerDb(filename);
    await db.load();
    return db;
  }

  private async load(): Promise<void> {
    if (!fs.existsSync(this.filename)) return;
    const raw = await fs.promises.readFile(this.filename, "utf8");
    const rows = JSON.parse(raw) as LedgerDbRow[];
    for (const row of rows) {
      await super.insertWriteSet(row);
    }
  }

  override async insertWriteSet(row: LedgerDbRow): Promise<void> {
    await super.insertWriteSet(row);
    await fs.promises.mkdir(path.dirname(this.filename), { recursive: true });
    const rows = await this.listWriteSets();
    await fs.promises.writeFile(this.filename, JSON.stringify(rows, null, 2), "utf8");
  }
}

export async function initLedgerDb(options?: LedgerDbOptions): Promise<LedgerDbHandle> {
  if (options?.filename) {
    return JsonFileLedgerDb.create(options.filename);
  }
  return new InMemoryLedgerDb();
}
