export interface Database {
  query<T>(statement: unknown): Promise<T>;
}
