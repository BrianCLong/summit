export interface AdapterMetadata {
  name: string;
  version: string;
  description?: string;
  capabilities?: string[];
}

export interface AdapterContext {
  requestId: string;
  environment?: string;
  secrets?: Record<string, string>;
  config?: Record<string, unknown>;
}

export interface AdapterEvent {
  id: string;
  type: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

export interface AdapterResponse {
  status: "ok" | "error";
  message: string;
  data?: unknown;
  durationMs?: number;
}

export interface AdapterRuntime {
  metadata: AdapterMetadata;
  handleEvent(
    event: AdapterEvent,
    context: AdapterContext
  ): Promise<AdapterResponse> | AdapterResponse;
  healthCheck?(context: AdapterContext): Promise<AdapterResponse> | AdapterResponse;
}

export interface ContractTestResult {
  passed: boolean;
  issues: string[];
  response?: AdapterResponse;
}

export interface PackageResult {
  manifestPath: string;
  bundlePath: string;
}

export interface PackageOptions {
  entry: string;
  outputDir?: string;
  manifestName?: string;
}

export interface InitOptions {
  template: string;
  directory: string;
  force?: boolean;
}

export interface RunOptions {
  entry: string;
  eventPath?: string;
  contextPath?: string;
}
