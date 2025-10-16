import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { updateFeatureFlags } from '../mvp1-features';
import {
  ABTestConfig,
  ABTestVariant,
  AppliedState,
  AuditEntry,
  CanaryConfig,
  ConfigSchema,
  ConfigVersion,
  ConfigWatcher,
  DriftDelta,
  DriftReport,
  EnvironmentName,
  FeatureFlagAdapter,
  FeatureFlagBindings,
  RepositoryWriter,
  SecretReference,
  SecretResolver,
  DeepPartial,
} from './types';

const SECRET_REFERENCE_KEY = '__secretRef';

interface CreateOrUpdateOptions<TConfig> {
  config: TConfig;
  overrides?: Partial<Record<EnvironmentName, DeepPartial<TConfig>>>;
  metadata: {
    actor: string;
    message?: string;
    source?: string;
    commitId?: string;
  };
  abTest?: ABTestConfig<TConfig>;
  canary?: CanaryConfig<TConfig>;
  featureFlags?: FeatureFlagBindings;
}

interface GetConfigOptions {
  environment?: EnvironmentName;
  resolveSecrets?: boolean;
  abTestVariant?: string;
  actorId?: string;
  requestId?: string;
  assignmentValue?: number;
}

interface ResolvedConfig<TConfig> {
  version: ConfigVersion<TConfig>;
  effectiveConfig: TConfig;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isSecretReference(
  value: unknown,
): value is { [SECRET_REFERENCE_KEY]: SecretReference } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      SECRET_REFERENCE_KEY in (value as Record<string, unknown>) &&
      typeof (value as Record<string, unknown>)[SECRET_REFERENCE_KEY] ===
        'object',
  );
}

function deepMerge<TConfig>(
  base: TConfig,
  override?: DeepPartial<TConfig>,
): TConfig {
  if (!override) {
    return base;
  }
  const result: any = Array.isArray(base) ? [...(base as any[])] : { ...base };
  for (const [key, value] of Object.entries(
    override as Record<string, unknown>,
  )) {
    if (value === undefined) {
      continue;
    }
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base &&
      typeof (base as any)[key] === 'object' &&
      !Array.isArray((base as any)[key])
    ) {
      result[key] = deepMerge((base as any)[key], value as any);
    } else {
      result[key] = value;
    }
  }
  return result as TConfig;
}

function collectDiffs(
  expected: unknown,
  actual: unknown,
  path: string[] = [],
): DriftDelta[] {
  if (JSON.stringify(expected) === JSON.stringify(actual)) {
    return [];
  }

  if (
    typeof expected !== 'object' ||
    expected === null ||
    typeof actual !== 'object' ||
    actual === null
  ) {
    return [
      {
        path: path.join('.') || 'root',
        expected,
        actual,
      },
    ];
  }

  const keys = new Set([
    ...Object.keys(expected as Record<string, unknown>),
    ...Object.keys(actual as Record<string, unknown>),
  ]);
  const deltas: DriftDelta[] = [];
  for (const key of keys) {
    deltas.push(
      ...collectDiffs((expected as any)[key], (actual as any)[key], [
        ...path,
        key,
      ]),
    );
  }
  return deltas;
}

function selectVariant<TConfig>(
  abTest: ABTestConfig<TConfig>,
  identifier: string,
  assignmentValue?: number,
): ABTestVariant<TConfig> | undefined {
  if (abTest.endAt && abTest.endAt.getTime() < Date.now()) {
    return undefined;
  }
  const totalWeight = abTest.variants.reduce(
    (sum, variant) => sum + variant.weight,
    0,
  );
  if (totalWeight <= 0) {
    return undefined;
  }
  const normalized = abTest.variants.map((variant) => ({
    ...variant,
    weight: variant.weight / totalWeight,
  }));
  const value =
    assignmentValue !== undefined
      ? assignmentValue
      : parseInt(
          createHash('sha1').update(identifier).digest('hex').slice(0, 8),
          16,
        ) / 0xffffffff;

  let cumulative = 0;
  for (const variant of normalized) {
    cumulative += variant.weight;
    if (value <= cumulative) {
      return variant;
    }
  }
  return normalized[normalized.length - 1];
}

export class DistributedConfigService<TConfig = Record<string, any>> {
  private readonly schemas = new Map<string, ConfigSchema>();
  private readonly watchers = new Map<string, Set<ConfigWatcher<TConfig>>>();
  private readonly events = new EventEmitter();
  private readonly clock: () => Date;

  constructor(
    private readonly repository: RepositoryWriter<TConfig>,
    private readonly options: {
      secretResolver?: SecretResolver;
      featureFlagAdapter?: FeatureFlagAdapter;
      clock?: () => Date;
    } = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  registerSchema(configId: string, schema: ConfigSchema): void {
    this.schemas.set(configId, schema);
  }

  async createOrUpdate(
    configId: string,
    options: CreateOrUpdateOptions<TConfig>,
  ): Promise<ConfigVersion<TConfig>> {
    const schema = this.schemas.get(configId);
    if (schema) {
      schema.parse(options.config);
      if (options.overrides) {
        const deepPartial = schema.deepPartial ? schema.deepPartial() : schema.partial();
        for (const override of Object.values(options.overrides)) {
          if (override) {
            deepPartial.parse(override);
          }
        }
      }
      if (options.abTest) {
        z.object({
          experimentId: z.string(),
          variants: z.array(
            z.object({
              name: z.string(),
              weight: z.number().positive(),
              config: schema.partial(),
            }),
          ),
          startAt: z.date(),
          endAt: z.date().optional(),
          targetingRules: z.record(z.any()).optional(),
        }).parse(options.abTest);
      }
      if (options.canary) {
        z.object({
          environment: z.string(),
          trafficPercent: z.number().min(0).max(100),
          config: schema.partial(),
          startAt: z.date(),
          endAt: z.date().optional(),
          guardRailMetrics: z.array(z.string()).optional(),
        }).parse(options.canary);
      }
    }

    const latest = await this.repository.getLatestVersion(configId);
    const nextVersionNumber = latest ? latest.metadata.version + 1 : 1;
    const metadata = {
      version: nextVersionNumber,
      createdAt: this.clock(),
      createdBy: options.metadata.actor,
      message: options.metadata.message,
      source: options.metadata.source,
      commitId: options.metadata.commitId,
    };

    const payload: ConfigVersion<TConfig> = {
      id: configId,
      config: deepClone(options.config),
      overrides: deepClone(options.overrides ?? {}),
      metadata,
      checksum: this.computeChecksum(
        options.config,
        options.overrides,
        options.abTest,
        options.canary,
      ),
      abTest: options.abTest,
      canary: options.canary,
      featureFlags: options.featureFlags,
    };

    const auditEntry: AuditEntry = {
      version: metadata.version,
      actor: options.metadata.actor,
      timestamp: metadata.createdAt,
      message: options.metadata.message,
      changes: this.computeChanges(latest?.config ?? {}, options.config),
    };

    await this.repository.saveVersion(configId, payload, auditEntry);

    if (payload.featureFlags) {
      await this.syncFeatureFlags(payload.featureFlags);
    }

    await this.notifyWatchers(configId, payload);
    return payload;
  }

  async getConfig(
    configId: string,
    options: GetConfigOptions = {},
  ): Promise<ResolvedConfig<TConfig>> {
    const version = await this.repository.getLatestVersion(configId);
    if (!version) {
      throw new Error(`Config ${configId} not found`);
    }

    let effectiveConfig: TConfig = deepClone(version.config);

    if (options.environment && version.overrides[options.environment]) {
      effectiveConfig = deepMerge(
        effectiveConfig,
        version.overrides[options.environment] as DeepPartial<TConfig>,
      );
    }

    if (
      version.canary &&
      this.isCanaryActive(version.canary, options.environment)
    ) {
      const sample =
        options.assignmentValue ??
        this.hashAssignment(options.actorId ?? options.requestId);
      if (sample <= version.canary.trafficPercent / 100) {
        effectiveConfig = deepMerge(effectiveConfig, version.canary.config);
      }
    }

    if (version.abTest && this.isABTestActive(version.abTest)) {
      const identifier = options.actorId ?? options.requestId ?? 'anonymous';
      const variant =
        options.abTestVariant &&
        version.abTest.variants.find(
          (entry) => entry.name === options.abTestVariant,
        )
          ? version.abTest.variants.find(
              (entry) => entry.name === options.abTestVariant,
            )
          : selectVariant(version.abTest, identifier, options.assignmentValue);
      if (variant) {
        effectiveConfig = deepMerge(effectiveConfig, variant.config as DeepPartial<TConfig>);
      }
    }

    if (options.resolveSecrets) {
      effectiveConfig = await this.resolveSecrets(effectiveConfig);
    }

    return { version, effectiveConfig };
  }

  async rollback(
    configId: string,
    versionNumber: number,
    actor: string,
    message?: string,
  ): Promise<ConfigVersion<TConfig>> {
    const target = await this.repository.getVersion(configId, versionNumber);
    if (!target) {
      throw new Error(`Version ${versionNumber} for ${configId} not found`);
    }
    return this.createOrUpdate(configId, {
      config: target.config,
      overrides: target.overrides,
      metadata: { actor, message: message ?? `Rollback to ${versionNumber}` },
      abTest: target.abTest,
      canary: target.canary,
      featureFlags: target.featureFlags,
    });
  }

  async detectDrift(
    configId: string,
    environment: EnvironmentName,
    actualConfig: TConfig,
  ): Promise<DriftReport> {
    const { version, effectiveConfig } = await this.getConfig(configId, {
      environment,
    });
    const deltas = collectDiffs(effectiveConfig, actualConfig);
    return {
      configId,
      environment,
      version: version.metadata.version,
      driftDetected: deltas.length > 0,
      deltas,
      generatedAt: this.clock(),
    };
  }

  async recordApplied(
    configId: string,
    environment: EnvironmentName,
  ): Promise<AppliedState> {
    const version = await this.repository.getLatestVersion(configId);
    if (!version) {
      throw new Error(`Config ${configId} not found`);
    }
    const state: AppliedState = {
      environment,
      version: version.metadata.version,
      checksum: version.checksum,
      appliedAt: this.clock(),
    };
    await this.repository.recordAppliedState(configId, state);
    return state;
  }

  async getAuditTrail(configId: string): Promise<AuditEntry[]> {
    return this.repository.getAuditTrail(configId);
  }

  registerWatcher(
    configId: string,
    watcher: ConfigWatcher<TConfig>,
  ): () => void {
    const watchers =
      this.watchers.get(configId) ?? new Set<ConfigWatcher<TConfig>>();
    watchers.add(watcher);
    this.watchers.set(configId, watchers);
    return () => {
      watchers.delete(watcher);
      if (watchers.size === 0) {
        this.watchers.delete(configId);
      }
    };
  }

  on(
    event: 'config:updated',
    listener: (payload: ConfigVersion<TConfig>) => void,
  ): void {
    this.events.on(event, listener);
  }

  private async notifyWatchers(
    configId: string,
    version: ConfigVersion<TConfig>,
  ): Promise<void> {
    const watchers = this.watchers.get(configId);
    if (watchers) {
      for (const watcher of watchers) {
        await watcher({ configId, version });
      }
    }
    this.events.emit('config:updated', version);
  }

  private computeChecksum(
    config: TConfig,
    overrides?: Partial<Record<EnvironmentName, Partial<TConfig>>>,
    abTest?: ABTestConfig<TConfig>,
    canary?: CanaryConfig<TConfig>,
  ): string {
    return createHash('sha256')
      .update(JSON.stringify({ config, overrides, abTest, canary }))
      .digest('hex');
  }

  private computeChanges(prevConfig: TConfig, nextConfig: TConfig): string[] {
    const deltas = collectDiffs(prevConfig, nextConfig);
    return deltas.map((delta) => delta.path);
  }

  private async resolveSecrets(config: TConfig): Promise<TConfig> {
    if (!this.options.secretResolver) {
      return config;
    }
    const traverse = async (value: any): Promise<any> => {
      if (Array.isArray(value)) {
        return Promise.all(value.map((item) => traverse(item)));
      }
      if (isSecretReference(value)) {
        const resolved = await this.options.secretResolver!.resolve(
          value[SECRET_REFERENCE_KEY] as SecretReference,
        );
        return resolved;
      }
      if (value && typeof value === 'object') {
        const entries = await Promise.all(
          Object.entries(value).map(async ([key, val]) => [
            key,
            await traverse(val),
          ]),
        );
        return Object.fromEntries(entries);
      }
      return value;
    };
    return (await traverse(config)) as TConfig;
  }

  private hashAssignment(identifier?: string): number {
    if (!identifier) {
      return Math.random();
    }
    return (
      parseInt(
        createHash('sha1').update(identifier).digest('hex').slice(0, 8),
        16,
      ) / 0xffffffff
    );
  }

  private isCanaryActive(
    canary: CanaryConfig<TConfig>,
    environment?: EnvironmentName,
  ): boolean {
    if (!environment || canary.environment !== environment) {
      return false;
    }
    const now = this.clock().getTime();
    if (canary.startAt.getTime() > now) {
      return false;
    }
    if (canary.endAt && canary.endAt.getTime() < now) {
      return false;
    }
    return canary.trafficPercent > 0;
  }

  private isABTestActive(abTest: ABTestConfig<TConfig>): boolean {
    const now = this.clock().getTime();
    return (
      abTest.startAt.getTime() <= now &&
      (!abTest.endAt || abTest.endAt.getTime() >= now)
    );
  }

  private async syncFeatureFlags(flags: FeatureFlagBindings): Promise<void> {
    if (this.options.featureFlagAdapter) {
      await this.options.featureFlagAdapter.updateFlags(flags);
    } else {
      updateFeatureFlags(flags);
    }
  }
}

export default DistributedConfigService;
