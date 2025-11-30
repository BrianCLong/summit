/**
 * CQRS Query Types
 */

export interface Query<T = any> {
  queryId: string;
  queryType: string;
  parameters: T;
  metadata?: QueryMetadata;
  timestamp: Date;
}

export interface QueryMetadata {
  userId?: string;
  traceId?: string;
  cacheKey?: string;
  cacheTTL?: number;
  [key: string]: any;
}

export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  fromCache?: boolean;
  executionTime?: number;
}

export type QueryHandler<TParams = any, TResult = any> = (
  query: Query<TParams>
) => Promise<QueryResult<TResult>>;

export interface QueryHandlerRegistration {
  queryType: string;
  handler: QueryHandler;
  cacheable?: boolean;
  cacheTTL?: number;
}

export interface ReadModel<T = any> {
  id: string;
  type: string;
  data: T;
  version: number;
  updatedAt: Date;
}
