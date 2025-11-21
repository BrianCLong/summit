import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * Data source connector extension point
 */
export interface DataSourceExtension extends ExtensionPoint<DataSourceQuery, DataSourceResult> {
  type: 'data-source';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
}

export interface DataSourceQuery {
  query: string;
  parameters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface DataSourceResult {
  data: any[];
  total: number;
  hasMore: boolean;
  metadata?: Record<string, any>;
}

/**
 * Base class for data source extensions
 */
export abstract class BaseDataSourceExtension implements DataSourceExtension {
  readonly type = 'data-source' as const;

  constructor(
    public readonly id: string,
    protected config: Record<string, any>
  ) {}

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;
  abstract execute(query: DataSourceQuery): Promise<DataSourceResult>;
}
