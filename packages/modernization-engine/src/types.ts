export interface CommandDefinition {
  name: string;
  path: string;
  idempotent: boolean;
}

export interface EventDefinition {
  name: string;
  channel: string;
  schemaVersion: number;
}

export interface ReadModelDefinition {
  name: string;
  projection: string;
  storage: "postgres" | "neo4j" | "redis" | "kafka";
}

export interface WritePathDefinition {
  name: string;
  adapter: string;
  storage: "postgres" | "neo4j" | "redis" | "kafka";
}

export interface DomainSLO {
  availability: number; // fraction e.g. 0.999
  latencyP95Ms: number;
  errorBudgetMinutes: number;
}

export interface DomainDefinition {
  name: string;
  owner: string;
  commands: CommandDefinition[];
  events: EventDefinition[];
  readModels: ReadModelDefinition[];
  writePath: WritePathDefinition;
  slo: DomainSLO;
}

export interface BoundaryViolation {
  type:
    | "CROSS_DOMAIN_DB_ACCESS"
    | "MULTIPLE_WRITE_PATHS"
    | "MISSING_ERROR_MODEL"
    | "STRANGLER_BYPASS";
  sourceService: string;
  sourceDomain: string;
  targetDomain: string;
  resource: string;
  severity: "low" | "medium" | "high" | "critical";
  details?: string;
  timestamp: Date;
}

export interface ServiceAccessDescriptor {
  service: string;
  domain: string;
  writes: Array<{ domain: string; resource: string; viaAdapter: boolean }>;
  reads: Array<{ domain: string; resource: string; viaAdapter: boolean }>;
  errorModelImplemented: boolean;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  domain: string;
  boundary: "internal" | "external";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  correlationId: string;
  timestamp: string;
  retryable: boolean;
  cause?: string;
  details?: Record<string, unknown>;
}

export interface DomainEvent {
  domain: string;
  name: string;
  latencyMs: number;
  violationObserved?: boolean;
  driftDelta?: number;
}

export interface TrafficDirective {
  domain: string;
  shadowPercentage: number;
  primaryPercentage: number;
  featureFlags: Record<string, boolean>;
  rationale: string;
}
