export type TelemetryMode = 'console' | 'otlp';

export interface NanoEventMetadata {
  readonly correlationId?: string;
  readonly source?: string;
  readonly tags?: readonly string[];
}

export interface NanoEvent<TPayload = Record<string, unknown>> {
  readonly type: string;
  readonly payload: TPayload;
  readonly timestamp: Date;
  readonly metadata?: NanoEventMetadata;
}

export interface RuntimeTelemetryConfig {
  readonly mode: TelemetryMode;
  readonly endpoint?: string;
  readonly sampleRate: number;
}

export interface RuntimeSecurityPolicy {
  readonly allowDynamicPlugins: boolean;
  readonly redactFields: readonly string[];
  readonly validateSignatures: boolean;
}

export interface RuntimePerformanceProfile {
  readonly maxConcurrency: number;
  readonly highWatermark: number;
  readonly adaptiveThrottling: boolean;
}

export interface RuntimeConfig {
  readonly id: string;
  readonly environment: 'dev' | 'staging' | 'prod' | 'test';
  readonly telemetry: RuntimeTelemetryConfig;
  readonly security: RuntimeSecurityPolicy;
  readonly performance: RuntimePerformanceProfile;
  readonly auditTrail: {
    readonly enabled: boolean;
    readonly sink: 'memory' | 'stdout';
  };
}

export interface RuntimeDiagnosticsEvent {
  readonly event: NanoEvent;
  readonly emittedAt: string;
  readonly durationMs?: number;
  readonly plugin?: string;
  readonly status: 'queued' | 'processed' | 'failed';
  readonly error?: string;
}

export interface RuntimeDiagnosticsSnapshot {
  readonly events: readonly RuntimeDiagnosticsEvent[];
  readonly metrics: Record<string, number>;
}

export interface RuntimeLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface RuntimeContext {
  readonly config: RuntimeConfig;
  readonly logger: RuntimeLogger;
  readonly metrics: MetricsRegistry;
  readonly diagnostics: DiagnosticTimeline;
}

export interface NanoPlugin {
  readonly name: string;
  readonly version: string;
  supportsEvent(event: NanoEvent): boolean;
  onEvent(event: NanoEvent, context: RuntimeContext): Promise<void> | void;
  onRegister?(context: RuntimeContext): Promise<void> | void;
  onShutdown?(context: RuntimeContext): Promise<void> | void;
}

export interface MetricsRegistry {
  recordCounter(name: string, value?: number): void;
  recordGauge(name: string, value: number): void;
  recordDuration(name: string, durationMs: number): void;
  snapshot(): Record<string, number>;
}

export interface DiagnosticTimeline {
  push(entry: RuntimeDiagnosticsEvent): void;
  last(count?: number): readonly RuntimeDiagnosticsEvent[];
  summarize(): RuntimeDiagnosticsSnapshot;
}
