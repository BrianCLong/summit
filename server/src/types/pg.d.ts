declare module 'pg' {
  export type QueryConfig<T = any> = {
    text: string;
    values?: any[];
  } & Record<string, unknown>;
  export type QueryResult<T = any> = { rows: T[] } & Record<string, unknown>;
  export type PoolClient = any;
  export class Pool {
    constructor(config?: any);
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
    query: (...args: any[]) => Promise<QueryResult>;
    connect: () => Promise<PoolClient>;
    end: () => Promise<void>;
    on: (...args: any[]) => void;
  }
}
