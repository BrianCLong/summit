sed -i 's/resolve(conn);/resolve(conn as any);/g' packages/summit-coggeo/src/storage/duckdb/duckdbClient.ts
sed -i 's/resolve(conn as any);/resolve();/g' packages/summit-coggeo/src/storage/duckdb/duckdbClient.ts
sed -i 's/db.connect((err: any, conn: duckdb.Connection)/db.connect(conn as any)/g' packages/summit-coggeo/src/storage/duckdb/duckdbClient.ts

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
        db.connect();
        resolve(db.connect() as unknown as duckdb.Connection);
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
    conn.all(sql, ...params, (err: any, rows: any) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}
INNER_EOF
