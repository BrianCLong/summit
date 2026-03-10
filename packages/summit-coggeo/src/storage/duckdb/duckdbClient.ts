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
        const conn = db.connect();
        resolve(conn);
      });
    },
    async close() {
      return;
    },
  };
}

export async function run(conn: duckdb.Connection, sql: string, params: any[] = []): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    conn.run(sql, ...params, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function all<T = any>(conn: duckdb.Connection, sql: string, params: any[] = []): Promise<T[]> {
  return await new Promise<T[]>((resolve, reject) => {
    conn.all(sql, ...params, (err: any, res: duckdb.TableData) => {
      if (err) return reject(err);
      resolve(res as unknown as T[]);
    });
  });
}
