declare module 'mysql2/promise' {
  export interface PoolConnection {
    query(sql: string, values?: unknown[]): Promise<unknown>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): void;
  }

  export interface Pool {
    getConnection(): Promise<PoolConnection>;
    query(sql: string, values?: unknown[]): Promise<unknown>;
    end(): Promise<void>;
  }

  export function createPool(connectionString: string): Pool;
}

declare module 'mongodb' {
  export interface ClientSession {
    startTransaction(): void;
    commitTransaction(): Promise<void>;
    abortTransaction(): Promise<void>;
    endSession(): Promise<void>;
  }

  export class MongoClient {
    constructor(connectionString: string);
    connect(): Promise<void>;
    close(): Promise<void>;
    startSession(): ClientSession;
  }

  export { MongoClient as NativeMongoClient };
}
