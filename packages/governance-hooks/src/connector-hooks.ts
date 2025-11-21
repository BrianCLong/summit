/**
 * Connector Governance Hooks
 *
 * Governance controls for data connectors and ingestion pipelines.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ConnectorEntity {
  type: string;
  externalId: string;
  props: Record<string, unknown>;
  confidence?: number;
  observedAt?: Date;
  validFrom?: Date;
  validTo?: Date;
}

export interface ConnectorContext {
  connectorId: string;
  tenantId: string;
  userId: string;
  investigationIds?: string[];
  defaultClassification?: string;
}

export interface ConnectorHook {
  /** Called before entity ingestion */
  beforeIngest?: (entity: ConnectorEntity, context: ConnectorContext) => Promise<ConnectorEntity | null>;
  /** Called after entity ingestion */
  afterIngest?: (entity: ConnectorEntity, context: ConnectorContext, entityId: string) => Promise<void>;
  /** Called on ingestion error */
  onError?: (entity: ConnectorEntity, context: ConnectorContext, error: Error) => Promise<void>;
}

// -----------------------------------------------------------------------------
// PII Detection Hook
// -----------------------------------------------------------------------------

export interface PIIDetectionConfig {
  patterns: Array<{
    name: string;
    regex: RegExp;
    fields?: string[]; // Specific fields to check
  }>;
  action: 'block' | 'flag' | 'redact' | 'log';
  flagField: string; // Field name to set when PII is flagged
}

export function createConnectorPIIHook(config: PIIDetectionConfig): ConnectorHook {
  return {
    async beforeIngest(entity: ConnectorEntity, context: ConnectorContext) {
      const piiFound: string[] = [];

      // Check each field in props
      for (const [key, value] of Object.entries(entity.props)) {
        if (typeof value !== 'string') continue;

        for (const pattern of config.patterns) {
          // Skip if pattern specifies fields and this isn't one
          if (pattern.fields && !pattern.fields.includes(key)) continue;

          if (pattern.regex.test(value)) {
            piiFound.push(`${pattern.name} in ${key}`);

            if (config.action === 'redact') {
              entity.props[key] = value.replace(pattern.regex, '[PII_REDACTED]');
            }
          }
        }
      }

      if (piiFound.length > 0) {
        switch (config.action) {
          case 'block':
            console.warn(`[ConnectorPII] Blocked entity with PII: ${piiFound.join(', ')}`);
            return null;
          case 'flag':
            entity.props[config.flagField] = true;
            entity.props[`${config.flagField}_types`] = piiFound;
            break;
          case 'log':
            console.warn(`[ConnectorPII] Entity ${entity.externalId} contains PII: ${piiFound.join(', ')}`);
            break;
        }
      }

      return entity;
    },
  };
}

// -----------------------------------------------------------------------------
// Classification Hook
// -----------------------------------------------------------------------------

export interface ClassificationConfig {
  /** Default classification for all entities */
  defaultClassification: string;
  /** Classification rules by entity type */
  rules: Array<{
    entityType?: string;
    fieldPattern?: { field: string; pattern: RegExp };
    classification: string;
  }>;
}

export function createClassificationHook(config: ClassificationConfig): ConnectorHook {
  return {
    async beforeIngest(entity: ConnectorEntity, context: ConnectorContext) {
      // Start with default or context classification
      let classification = context.defaultClassification || config.defaultClassification;

      // Apply rules
      for (const rule of config.rules) {
        // Check entity type match
        if (rule.entityType && entity.type !== rule.entityType) continue;

        // Check field pattern match
        if (rule.fieldPattern) {
          const fieldValue = entity.props[rule.fieldPattern.field];
          if (typeof fieldValue !== 'string' || !rule.fieldPattern.pattern.test(fieldValue)) {
            continue;
          }
        }

        // Apply classification (higher classifications override lower)
        classification = higherClassification(classification, rule.classification);
      }

      entity.props._classification = classification;
      return entity;
    },
  };
}

function higherClassification(a: string, b: string): string {
  const order = ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
  const aIndex = order.indexOf(a);
  const bIndex = order.indexOf(b);
  return aIndex >= bIndex ? a : b;
}

// -----------------------------------------------------------------------------
// Deduplication Hook
// -----------------------------------------------------------------------------

export interface DeduplicationConfig {
  /** Fields to use for deduplication key */
  keyFields: string[];
  /** Redis client for distributed dedup */
  redisClient?: any;
  /** TTL for dedup keys in seconds */
  ttlSeconds: number;
  /** Action when duplicate found */
  action: 'skip' | 'update' | 'merge';
}

export function createDeduplicationHook(config: DeduplicationConfig): ConnectorHook {
  const localCache = new Map<string, number>();

  return {
    async beforeIngest(entity: ConnectorEntity, context: ConnectorContext) {
      // Build dedup key
      const keyParts = [entity.type];
      for (const field of config.keyFields) {
        const value = entity.props[field];
        if (value !== undefined) {
          keyParts.push(String(value));
        }
      }
      const dedupKey = `dedup:${context.tenantId}:${keyParts.join(':')}`;

      // Check for duplicate
      let isDuplicate = false;

      if (config.redisClient) {
        const exists = await config.redisClient.get(dedupKey);
        isDuplicate = !!exists;
        if (!isDuplicate) {
          await config.redisClient.setex(dedupKey, config.ttlSeconds, '1');
        }
      } else {
        isDuplicate = localCache.has(dedupKey);
        if (!isDuplicate) {
          localCache.set(dedupKey, Date.now());
          // Clean old entries
          const cutoff = Date.now() - config.ttlSeconds * 1000;
          for (const [k, v] of localCache.entries()) {
            if (v < cutoff) localCache.delete(k);
          }
        }
      }

      if (isDuplicate && config.action === 'skip') {
        return null;
      }

      if (isDuplicate) {
        entity.props._dedupAction = config.action;
      }

      return entity;
    },
  };
}

// -----------------------------------------------------------------------------
// License Validation Hook
// -----------------------------------------------------------------------------

export interface LicenseValidationConfig {
  /** Allowed licenses */
  allowedLicenses: string[];
  /** License field in entity props */
  licenseField: string;
  /** Action when license invalid */
  action: 'block' | 'flag' | 'warn';
}

export function createLicenseValidationHook(config: LicenseValidationConfig): ConnectorHook {
  return {
    async beforeIngest(entity: ConnectorEntity, context: ConnectorContext) {
      const license = entity.props[config.licenseField];

      if (!license || !config.allowedLicenses.includes(String(license))) {
        switch (config.action) {
          case 'block':
            console.warn(`[ConnectorLicense] Blocked entity with invalid license: ${license}`);
            return null;
          case 'flag':
            entity.props._licenseInvalid = true;
            entity.props._originalLicense = license;
            break;
          case 'warn':
            console.warn(`[ConnectorLicense] Entity ${entity.externalId} has invalid license: ${license}`);
            break;
        }
      }

      return entity;
    },
  };
}

// -----------------------------------------------------------------------------
// Provenance Hook
// -----------------------------------------------------------------------------

export interface ConnectorProvenanceRecorder {
  recordIngestion(event: ConnectorProvenanceEvent): Promise<string>;
}

export interface ConnectorProvenanceEvent {
  connectorId: string;
  tenantId: string;
  entityType: string;
  externalId: string;
  internalId?: string;
  sourceHash: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export function createConnectorProvenanceHook(recorder: ConnectorProvenanceRecorder): ConnectorHook {
  return {
    async afterIngest(entity: ConnectorEntity, context: ConnectorContext, entityId: string) {
      const sourceHash = hashEntity(entity);

      await recorder.recordIngestion({
        connectorId: context.connectorId,
        tenantId: context.tenantId,
        entityType: entity.type,
        externalId: entity.externalId,
        internalId: entityId,
        sourceHash,
        timestamp: new Date(),
        metadata: {
          confidence: entity.confidence,
          observedAt: entity.observedAt,
        },
      });
    },
  };
}

function hashEntity(entity: ConnectorEntity): string {
  const data = JSON.stringify({
    type: entity.type,
    externalId: entity.externalId,
    props: entity.props,
  });
  // Simple hash - use crypto in production
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(16);
}

// -----------------------------------------------------------------------------
// Rate Limiting Hook
// -----------------------------------------------------------------------------

export interface ConnectorRateLimitConfig {
  /** Max entities per minute */
  maxEntitiesPerMinute: number;
  /** Max entities per hour */
  maxEntitiesPerHour: number;
  /** Action when limit exceeded */
  action: 'block' | 'queue' | 'warn';
}

export function createConnectorRateLimitHook(config: ConnectorRateLimitConfig): ConnectorHook {
  const minuteWindow: number[] = [];
  const hourWindow: number[] = [];

  return {
    async beforeIngest(entity: ConnectorEntity, context: ConnectorContext) {
      const now = Date.now();

      // Clean old entries
      while (minuteWindow.length > 0 && minuteWindow[0] < now - 60000) {
        minuteWindow.shift();
      }
      while (hourWindow.length > 0 && hourWindow[0] < now - 3600000) {
        hourWindow.shift();
      }

      // Check limits
      if (minuteWindow.length >= config.maxEntitiesPerMinute) {
        if (config.action === 'block') {
          throw new Error('Rate limit exceeded: max entities per minute');
        } else if (config.action === 'warn') {
          console.warn('[ConnectorRateLimit] Minute rate limit exceeded');
        }
      }

      if (hourWindow.length >= config.maxEntitiesPerHour) {
        if (config.action === 'block') {
          throw new Error('Rate limit exceeded: max entities per hour');
        } else if (config.action === 'warn') {
          console.warn('[ConnectorRateLimit] Hour rate limit exceeded');
        }
      }

      // Record this entity
      minuteWindow.push(now);
      hourWindow.push(now);

      return entity;
    },
  };
}

// -----------------------------------------------------------------------------
// Composite Hook
// -----------------------------------------------------------------------------

export function composeConnectorHooks(...hooks: ConnectorHook[]): ConnectorHook {
  return {
    async beforeIngest(entity: ConnectorEntity, context: ConnectorContext) {
      let current: ConnectorEntity | null = entity;

      for (const hook of hooks) {
        if (hook.beforeIngest && current) {
          current = await hook.beforeIngest(current, context);
        }
      }

      return current;
    },

    async afterIngest(entity: ConnectorEntity, context: ConnectorContext, entityId: string) {
      for (const hook of hooks) {
        if (hook.afterIngest) {
          await hook.afterIngest(entity, context, entityId);
        }
      }
    },

    async onError(entity: ConnectorEntity, context: ConnectorContext, error: Error) {
      for (const hook of hooks) {
        if (hook.onError) {
          await hook.onError(entity, context, error);
        }
      }
    },
  };
}
