export interface ToolEntry {
  tool_id: string;
  capability: string[];
  cost_hints?: Record<string, unknown>;
  permissions_requested?: string[];
  server_id?: string;
}

export interface ServerEntry {
  server_id: string;
  endpoint: string;
  transport: string;
  capability: string[];
  health_check?: Record<string, unknown>;
}

export interface RegistryRoot {
  version: string;
  tools: ToolEntry[];
  servers: ServerEntry[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  stats: {
    tools: number;
    servers: number;
  };
}

export interface ValidationError {
  file?: string;
  path: string;
  message: string;
  hint?: string;
}
