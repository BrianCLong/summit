"use strict";
/**
 * Connector Governance Hooks
 *
 * Governance controls for data connectors and ingestion pipelines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnectorPIIHook = createConnectorPIIHook;
exports.createClassificationHook = createClassificationHook;
exports.createDeduplicationHook = createDeduplicationHook;
exports.createLicenseValidationHook = createLicenseValidationHook;
exports.createConnectorProvenanceHook = createConnectorProvenanceHook;
exports.createConnectorRateLimitHook = createConnectorRateLimitHook;
exports.composeConnectorHooks = composeConnectorHooks;
function createConnectorPIIHook(config) {
    return {
        async beforeIngest(entity, context) {
            const piiFound = [];
            // Check each field in props
            for (const [key, value] of Object.entries(entity.props)) {
                if (typeof value !== 'string') {
                    continue;
                }
                for (const pattern of config.patterns) {
                    // Skip if pattern specifies fields and this isn't one
                    if (pattern.fields && !pattern.fields.includes(key)) {
                        continue;
                    }
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
function createClassificationHook(config) {
    return {
        async beforeIngest(entity, context) {
            // Start with default or context classification
            let classification = context.defaultClassification || config.defaultClassification;
            // Apply rules
            for (const rule of config.rules) {
                // Check entity type match
                if (rule.entityType && entity.type !== rule.entityType) {
                    continue;
                }
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
function higherClassification(a, b) {
    const order = ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    return aIndex >= bIndex ? a : b;
}
function createDeduplicationHook(config) {
    const localCache = new Map();
    return {
        async beforeIngest(entity, context) {
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
                isDuplicate = Boolean(exists);
                if (!isDuplicate) {
                    await config.redisClient.setex(dedupKey, config.ttlSeconds, '1');
                }
            }
            else {
                isDuplicate = localCache.has(dedupKey);
                if (!isDuplicate) {
                    localCache.set(dedupKey, Date.now());
                    // Clean old entries
                    const cutoff = Date.now() - config.ttlSeconds * 1000;
                    for (const [k, v] of localCache.entries()) {
                        if (v < cutoff) {
                            localCache.delete(k);
                        }
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
function createLicenseValidationHook(config) {
    return {
        async beforeIngest(entity, context) {
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
function createConnectorProvenanceHook(recorder) {
    return {
        async afterIngest(entity, context, entityId) {
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
function hashEntity(entity) {
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
function createConnectorRateLimitHook(config) {
    const minuteWindow = [];
    const hourWindow = [];
    return {
        async beforeIngest(entity, context) {
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
                }
                else if (config.action === 'warn') {
                    console.warn('[ConnectorRateLimit] Minute rate limit exceeded');
                }
            }
            if (hourWindow.length >= config.maxEntitiesPerHour) {
                if (config.action === 'block') {
                    throw new Error('Rate limit exceeded: max entities per hour');
                }
                else if (config.action === 'warn') {
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
function composeConnectorHooks(...hooks) {
    return {
        async beforeIngest(entity, context) {
            let current = entity;
            for (const hook of hooks) {
                if (hook.beforeIngest && current) {
                    current = await hook.beforeIngest(current, context);
                }
            }
            return current;
        },
        async afterIngest(entity, context, entityId) {
            for (const hook of hooks) {
                if (hook.afterIngest) {
                    await hook.afterIngest(entity, context, entityId);
                }
            }
        },
        async onError(entity, context, error) {
            for (const hook of hooks) {
                if (hook.onError) {
                    await hook.onError(entity, context, error);
                }
            }
        },
    };
}
