import { z, ZodType } from 'zod';

export type EnvironmentName =
  | 'development'
  | 'staging'
  | 'qa'
  | 'production'
  | string;

export interface SecretReference {
  provider: string;
  key: string;
  path?: string;
}

export interface ConfigMetadata {
  version: number;
  createdAt: Date;
  createdBy: string;
  message?: string;
  source?: string;
  commitId?: string;
}

export interface AuditEntry {
  version: number;
  actor: string;
  timestamp: Date;
  message?: string;
  changes?: string[];
}

export interface AppliedState {
  environment: EnvironmentName;
  version: number;
  checksum: string;
  appliedAt: Date;
}

export interface ABTestVariant<TConfig> {
  name: string;
  config: Partial<TConfig>;
  weight: number;
}

export interface ABTestConfig<TConfig> {
  experimentId: string;
  variants: ABTestVariant<TConfig>[];
  startAt: Date;
  endAt?: Date;
  targetingRules?: Record<string, unknown>;
}

export interface CanaryConfig<TConfig> {
  environment: EnvironmentName;
  trafficPercent: number;
  config: Partial<TConfig>;
  startAt: Date;
  endAt?: Date;
  guardRailMetrics?: string[];
}

export interface FeatureFlagBindings {
  [flagName: string]: boolean;
}

export interface ConfigVersion<TConfig = Record<string, any>> {
  id: string;
  config: TConfig;
  overrides: Partial<Record<EnvironmentName, Partial<TConfig>>>;
  metadata: ConfigMetadata;
  checksum: string;
  abTest?: ABTestConfig<TConfig>;
  canary?: CanaryConfig<TConfig>;
  featureFlags?: FeatureFlagBindings;
}

export interface DriftDelta {
  path: string;
  expected: unknown;
  actual: unknown;
}

export interface DriftReport {
  configId: string;
  environment: EnvironmentName;
  version: number;
  driftDetected: boolean;
  deltas: DriftDelta[];
  generatedAt: Date;
}

export type ConfigSchema = ZodType<any>;

export type ConfigWatcher<TConfig = Record<string, any>> = (payload: {
  configId: string;
  version: ConfigVersion<TConfig>;
}) => void | Promise<void>;

export interface SecretResolver {
  resolve(reference: SecretReference): Promise<string>;
}

export interface FeatureFlagAdapter {
  updateFlags(flags: FeatureFlagBindings): Promise<void>;
}

export interface RepositoryWriter<TConfig = Record<string, any>> {
  saveVersion(
    configId: string,
    version: ConfigVersion<TConfig>,
    auditEntry: AuditEntry,
  ): Promise<void>;
  getLatestVersion(
    configId: string,
  ): Promise<ConfigVersion<TConfig> | undefined>;
  getVersion(
    configId: string,
    versionNumber: number,
  ): Promise<ConfigVersion<TConfig> | undefined>;
  listVersions(configId: string): Promise<ConfigVersion<TConfig>[]>;
  recordAppliedState(configId: string, state: AppliedState): Promise<void>;
  getAppliedState(
    configId: string,
    environment: EnvironmentName,
  ): Promise<AppliedState | undefined>;
  getAuditTrail(configId: string): Promise<AuditEntry[]>;
}
