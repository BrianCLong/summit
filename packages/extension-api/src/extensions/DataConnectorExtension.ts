import { ExtensionPoint } from "../ExtensionPoint.js";

export interface DataQuery {
  operation: "read" | "write" | "list" | "delete";
  resource: string;
  parameters?: Record<string, any>;
  data?: any; // For write
  pagination?: {
    limit: number;
    offset: number;
    cursor?: string;
  };
}

export interface DataResult {
  data: any;
  metadata?: {
    total?: number;
    hasMore?: boolean;
    nextCursor?: string;
  };
  success: boolean;
  error?: string;
}

/**
 * Data Connector Extension - Defines a connection to an external data source.
 */
export interface DataConnectorExtension extends ExtensionPoint<DataQuery, DataResult> {
  type: "data-connector";

  connectorType: string;
  capabilities: ("read" | "write" | "list" | "delete" | "stream")[];
  requiredScopes?: string[];

  connect(config: Record<string, any>): Promise<boolean>;
  disconnect(): Promise<void>;
  testConnection(config: Record<string, any>): Promise<boolean>;
}

export abstract class BaseDataConnectorExtension implements DataConnectorExtension {
  readonly type = "data-connector" as const;

  constructor(
    public readonly id: string,
    public readonly connectorType: string,
    public readonly capabilities: ("read" | "write" | "list" | "delete" | "stream")[],
    public readonly requiredScopes: string[] = []
  ) {}

  abstract connect(config: Record<string, any>): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(config: Record<string, any>): Promise<boolean>;

  abstract execute(query: DataQuery): Promise<DataResult>;
}
