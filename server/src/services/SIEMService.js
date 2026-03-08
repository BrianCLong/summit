"use strict";
/**
 * SIEM Integration Service
 *
 * Integrates with Security Information and Event Management (SIEM) systems
 * including Splunk, Elastic Security, Microsoft Sentinel, and others.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.siemService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const CircuitBreaker_js_1 = require("../utils/CircuitBreaker.js");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class SIEMService {
    providers = new Map();
    eventBuffer = new Map();
    circuitBreakers = new Map();
    batchInterval = null;
    cachePrefix = 'siem:';
    constructor() {
        this.initializeProviders();
        this.startBatchProcessor();
    }
    /**
     * Initialize SIEM providers
     */
    async initializeProviders() {
        try {
            // Splunk Enterprise Security
            const splunkProvider = {
                id: 'splunk',
                name: 'Splunk Enterprise Security',
                type: 'splunk',
                enabled: process.env.SIEM_SPLUNK_ENABLED === 'true',
                config: {
                    url: process.env.SIEM_SPLUNK_URL || 'https://splunk.company.com:8088',
                    index: process.env.SIEM_SPLUNK_INDEX || 'intelgraph',
                    timeout: 30000,
                    retryAttempts: 3,
                    enableSSL: true,
                    verifyCerts: true,
                },
                credentials: {
                    type: 'token',
                    token: process.env.SIEM_SPLUNK_TOKEN || '',
                },
                fieldMapping: {
                    timestamp: 'time',
                    eventType: 'sourcetype',
                    severity: 'severity',
                    source: 'source',
                    userId: 'user_id',
                    tenantId: 'tenant_id',
                    ipAddress: 'src_ip',
                    userAgent: 'user_agent',
                },
                filters: [
                    {
                        field: 'severity',
                        operator: 'equals',
                        value: ['medium', 'high', 'critical'],
                        action: 'include',
                    },
                ],
                rateLimits: {
                    maxEventsPerSecond: 100,
                    maxEventsPerBatch: 1000,
                    batchTimeoutMs: 5000,
                },
            };
            // Elastic Security (ELK Stack)
            const elasticProvider = {
                id: 'elastic',
                name: 'Elastic Security',
                type: 'elastic',
                enabled: process.env.SIEM_ELASTIC_ENABLED === 'true',
                config: {
                    url: process.env.SIEM_ELASTIC_URL ||
                        'https://elasticsearch.company.com:9200',
                    index: process.env.SIEM_ELASTIC_INDEX || 'intelgraph-security',
                    timeout: 30000,
                    retryAttempts: 3,
                },
                credentials: {
                    type: 'basic',
                    username: process.env.SIEM_ELASTIC_USERNAME || '',
                    password: process.env.SIEM_ELASTIC_PASSWORD || '',
                },
                fieldMapping: {
                    timestamp: '@timestamp',
                    eventType: 'event.category',
                    severity: 'event.severity',
                    source: 'event.provider',
                    userId: 'user.id',
                    tenantId: 'organization.id',
                    ipAddress: 'source.ip',
                    userAgent: 'user_agent.original',
                },
                filters: [],
                rateLimits: {
                    maxEventsPerSecond: 200,
                    maxEventsPerBatch: 500,
                    batchTimeoutMs: 3000,
                },
            };
            // Microsoft Sentinel
            const sentinelProvider = {
                id: 'sentinel',
                name: 'Microsoft Sentinel',
                type: 'sentinel',
                enabled: process.env.SIEM_SENTINEL_ENABLED === 'true',
                config: {
                    url: process.env.SIEM_SENTINEL_URL || 'https://management.azure.com',
                    workspace: process.env.SIEM_SENTINEL_WORKSPACE || '',
                    timeout: 30000,
                    retryAttempts: 3,
                },
                credentials: {
                    type: 'oauth',
                    clientId: process.env.SIEM_SENTINEL_CLIENT_ID || '',
                    clientSecret: process.env.SIEM_SENTINEL_CLIENT_SECRET || '',
                    tenantId: process.env.SIEM_SENTINEL_TENANT_ID || '',
                },
                fieldMapping: {
                    timestamp: 'TimeGenerated',
                    eventType: 'Type',
                    severity: 'SeverityLevel',
                    source: 'SourceSystem',
                    userId: 'UserId',
                    tenantId: 'TenantId',
                    ipAddress: 'SourceIP',
                    userAgent: 'UserAgent',
                },
                filters: [],
                rateLimits: {
                    maxEventsPerSecond: 50,
                    maxEventsPerBatch: 100,
                    batchTimeoutMs: 10000,
                },
            };
            // IBM QRadar
            const qradarProvider = {
                id: 'qradar',
                name: 'IBM QRadar',
                type: 'qradar',
                enabled: process.env.SIEM_QRADAR_ENABLED === 'true',
                config: {
                    url: process.env.SIEM_QRADAR_URL || 'https://qradar.company.com',
                    timeout: 30000,
                    retryAttempts: 3,
                },
                credentials: {
                    type: 'token',
                    token: process.env.SIEM_QRADAR_TOKEN || '',
                },
                fieldMapping: {
                    timestamp: 'starttime',
                    eventType: 'qid',
                    severity: 'severity',
                    source: 'sourceip',
                    userId: 'username',
                    ipAddress: 'sourceip',
                },
                filters: [],
                rateLimits: {
                    maxEventsPerSecond: 25,
                    maxEventsPerBatch: 50,
                    batchTimeoutMs: 15000,
                },
            };
            // Register providers
            this.providers.set('splunk', splunkProvider);
            this.providers.set('elastic', elasticProvider);
            this.providers.set('sentinel', sentinelProvider);
            this.providers.set('qradar', qradarProvider);
            // Initialize circuit breakers
            for (const [id, provider] of this.providers.entries()) {
                if (provider.enabled) {
                    this.circuitBreakers.set(id, new CircuitBreaker_js_1.CircuitBreaker({
                        failureThreshold: 5,
                        resetTimeout: 60000,
                        // monitoringPeriod: 300000, // Not a valid CircuitBreakerOption
                    }));
                    this.eventBuffer.set(id, []);
                }
            }
            logger_js_1.default.info('SIEM providers initialized', {
                component: 'SIEMService',
                enabledProviders: Array.from(this.providers.values())
                    .filter((p) => p.enabled)
                    .map((p) => p.name),
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize SIEM providers', {
                component: 'SIEMService',
                error: error.message,
            });
        }
    }
    /**
     * Send event to SIEM systems
     */
    async sendEvent(event) {
        const enabledProviders = Array.from(this.providers.values()).filter((p) => p.enabled);
        if (enabledProviders.length === 0) {
            logger_js_1.default.debug('No SIEM providers enabled, skipping event', {
                component: 'SIEMService',
                eventType: event.eventType,
            });
            return;
        }
        // Add to buffer for each enabled provider
        for (const provider of enabledProviders) {
            if (this.shouldSendEvent(event, provider)) {
                const buffer = this.eventBuffer.get(provider.id) || [];
                buffer.push(event);
                this.eventBuffer.set(provider.id, buffer);
                // Send immediately if buffer is full
                if (buffer.length >= provider.rateLimits.maxEventsPerBatch) {
                    await this.flushBuffer(provider.id);
                }
            }
        }
    }
    /**
     * Send multiple events in batch
     */
    async sendEvents(events) {
        for (const event of events) {
            await this.sendEvent(event);
        }
    }
    /**
     * Check if event should be sent based on provider filters
     */
    shouldSendEvent(event, provider) {
        for (const filter of provider.filters) {
            const fieldValue = this.getEventField(event, filter.field);
            if (!this.matchesFilter(fieldValue, filter)) {
                return filter.action === 'exclude';
            }
        }
        return true;
    }
    /**
     * Get field value from event
     */
    getEventField(event, field) {
        switch (field) {
            case 'severity':
                return event.severity;
            case 'eventType':
                return event.eventType;
            case 'source':
                return event.source;
            case 'userId':
                return event.userId;
            case 'tenantId':
                return event.tenantId;
            default:
                return event.details[field];
        }
    }
    /**
     * Check if field value matches filter
     */
    matchesFilter(fieldValue, filter) {
        switch (filter.operator) {
            case 'equals':
                return Array.isArray(filter.value)
                    ? filter.value.includes(fieldValue)
                    : fieldValue === filter.value;
            case 'contains':
                return String(fieldValue)
                    .toLowerCase()
                    .includes(String(filter.value).toLowerCase());
            case 'regex':
                return new RegExp(String(filter.value)).test(String(fieldValue));
            case 'range':
                if (Array.isArray(filter.value) && filter.value.length === 2) {
                    return fieldValue >= filter.value[0] && fieldValue <= filter.value[1];
                }
                return false;
            default:
                return false;
        }
    }
    /**
     * Start batch processor
     */
    startBatchProcessor() {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
        }
        this.batchInterval = setInterval(async () => {
            for (const providerId of this.eventBuffer.keys()) {
                const buffer = this.eventBuffer.get(providerId) || [];
                if (buffer.length > 0) {
                    await this.flushBuffer(providerId);
                }
            }
        }, 5000); // Check every 5 seconds
    }
    /**
     * Flush event buffer for a provider
     */
    async flushBuffer(providerId) {
        const buffer = this.eventBuffer.get(providerId) || [];
        if (buffer.length === 0)
            return;
        const provider = this.providers.get(providerId);
        if (!provider)
            return;
        // Clear buffer immediately to prevent duplicates
        this.eventBuffer.set(providerId, []);
        const batchId = `${providerId}-${Date.now()}-${crypto_1.default.randomBytes(4).toString('hex')}`;
        const batch = {
            id: batchId,
            providerId,
            events: [...buffer], // Copy events
            createdAt: new Date(),
            status: 'pending',
            attempts: 0,
        };
        await this.sendBatch(batch);
    }
    /**
     * Send batch to SIEM provider
     */
    async sendBatch(batch) {
        const provider = this.providers.get(batch.providerId);
        if (!provider)
            return;
        const circuitBreaker = this.circuitBreakers.get(batch.providerId);
        if (!circuitBreaker)
            return;
        try {
            await circuitBreaker.execute(async () => {
                batch.attempts++;
                batch.lastAttempt = new Date();
                batch.status = 'pending';
                logger_js_1.default.debug('Sending SIEM batch', {
                    component: 'SIEMService',
                    providerId: batch.providerId,
                    batchId: batch.id,
                    eventCount: batch.events.length,
                    attempt: batch.attempts,
                });
                switch (provider.type) {
                    case 'splunk':
                        await this.sendToSplunk(provider, batch);
                        break;
                    case 'elastic':
                        await this.sendToElastic(provider, batch);
                        break;
                    case 'sentinel':
                        await this.sendToSentinel(provider, batch);
                        break;
                    case 'qradar':
                        await this.sendToQRadar(provider, batch);
                        break;
                    default:
                        await this.sendToGeneric(provider, batch);
                }
                batch.status = 'sent';
                logger_js_1.default.info('SIEM batch sent successfully', {
                    component: 'SIEMService',
                    providerId: batch.providerId,
                    batchId: batch.id,
                    eventCount: batch.events.length,
                });
            });
        }
        catch (error) {
            batch.status = 'failed';
            batch.error = error.message;
            logger_js_1.default.error('Failed to send SIEM batch', {
                component: 'SIEMService',
                providerId: batch.providerId,
                batchId: batch.id,
                error: error.message,
                attempts: batch.attempts,
            });
            // Retry logic
            if (batch.attempts < (provider.config.retryAttempts || 3)) {
                setTimeout(async () => {
                    await this.sendBatch(batch);
                }, Math.pow(2, batch.attempts) * 1000); // Exponential backoff
            }
        }
    }
    /**
     * Send batch to Splunk
     */
    async sendToSplunk(provider, batch) {
        const events = batch.events.map((event) => ({
            time: event.timestamp.getTime() / 1000,
            source: 'intelgraph',
            sourcetype: event.eventType,
            index: provider.config.index,
            event: {
                ...this.mapEventFields(event, provider.fieldMapping),
                message: event.message,
                severity: event.severity,
                source: event.source,
                user_id: event.userId,
                tenant_id: event.tenantId,
                src_ip: event.ipAddress,
                user_agent: event.userAgent,
                tags: event.tags?.join(','),
                raw_data: event.rawData,
            },
        }));
        const payload = events.map((e) => JSON.stringify(e)).join('\n');
        await axios_1.default.post(`${provider.config.url}/services/collector/event`, payload, {
            headers: {
                Authorization: `Splunk ${provider.credentials.token}`,
                'Content-Type': 'application/json',
            },
            timeout: provider.config.timeout,
        });
    }
    /**
     * Send batch to Elasticsearch
     */
    async sendToElastic(provider, batch) {
        const bulkBody = [];
        for (const event of batch.events) {
            // Index metadata
            bulkBody.push({
                index: {
                    _index: provider.config.index,
                    _type: '_doc',
                },
            });
            // Document body
            bulkBody.push({
                '@timestamp': event.timestamp.toISOString(),
                ...this.mapEventFields(event, provider.fieldMapping),
                message: event.message,
                'event.category': event.eventType,
                'event.severity': this.mapSeverityToECS(event.severity),
                'event.provider': event.source,
                'user.id': event.userId,
                'organization.id': event.tenantId,
                'source.ip': event.ipAddress,
                'user_agent.original': event.userAgent,
                tags: event.tags || [],
                raw_data: event.rawData,
            });
        }
        await axios_1.default.post(`${provider.config.url}/_bulk`, bulkBody.map((item) => JSON.stringify(item)).join('\n') + '\n', {
            headers: {
                'Content-Type': 'application/x-ndjson',
                Authorization: `Basic ${Buffer.from(`${provider.credentials.username}:${provider.credentials.password}`).toString('base64')}`,
            },
            timeout: provider.config.timeout,
        });
    }
    /**
     * Send batch to Microsoft Sentinel
     */
    async sendToSentinel(provider, batch) {
        // First, get access token
        const tokenResponse = await axios_1.default.post(`https://login.microsoftonline.com/${provider.credentials.tenantId}/oauth2/v2.0/token`, new URLSearchParams({
            client_id: provider.credentials.clientId || '',
            client_secret: provider.credentials.clientSecret || '',
            scope: 'https://management.azure.com/.default',
            grant_type: 'client_credentials',
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const accessToken = tokenResponse.data.access_token;
        // Send events to Log Analytics workspace
        const events = batch.events.map((event) => ({
            TimeGenerated: event.timestamp.toISOString(),
            Type: 'IntelGraphEvent',
            SeverityLevel: this.mapSeverityToSentinel(event.severity),
            SourceSystem: event.source,
            Message: event.message,
            UserId: event.userId,
            TenantId: event.tenantId,
            SourceIP: event.ipAddress,
            UserAgent: event.userAgent,
            EventType: event.eventType,
            Tags: event.tags?.join(';'),
            RawData: JSON.stringify(event.rawData),
        }));
        await axios_1.default.post(`https://${provider.config.workspace}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`, JSON.stringify(events), {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Log-Type': 'IntelGraphEvent',
            },
            timeout: provider.config.timeout,
        });
    }
    /**
     * Send batch to IBM QRadar
     */
    async sendToQRadar(provider, batch) {
        for (const event of batch.events) {
            const qradarEvent = {
                starttime: event.timestamp.getTime(),
                qid: this.getQRadarEventId(event.eventType),
                severity: this.mapSeverityToQRadar(event.severity),
                sourceip: event.ipAddress || '127.0.0.1',
                username: event.userId,
                message: event.message,
                properties: {
                    tenant_id: event.tenantId,
                    user_agent: event.userAgent,
                    event_type: event.eventType,
                    source: event.source,
                    tags: event.tags?.join(','),
                    raw_data: JSON.stringify(event.rawData),
                },
            };
            await axios_1.default.post(`${provider.config.url}/api/siem/events`, qradarEvent, {
                headers: {
                    SEC: provider.credentials.token,
                    'Content-Type': 'application/json',
                },
                timeout: provider.config.timeout,
            });
        }
    }
    /**
     * Send batch to generic SIEM
     */
    async sendToGeneric(provider, batch) {
        const payload = {
            provider: provider.id,
            timestamp: new Date().toISOString(),
            events: batch.events.map((event) => this.mapEventFields(event, provider.fieldMapping)),
        };
        await axios_1.default.post(provider.config.url, payload, {
            headers: {
                'Content-Type': 'application/json',
                ...(provider.credentials.token
                    ? { Authorization: `Bearer ${provider.credentials.token}` }
                    : {}),
            },
            timeout: provider.config.timeout,
        });
    }
    /**
     * Map event fields based on provider field mapping
     */
    mapEventFields(event, mapping) {
        const mapped = {};
        mapped[mapping.timestamp] = event.timestamp.toISOString();
        mapped[mapping.eventType] = event.eventType;
        mapped[mapping.severity] = event.severity;
        mapped[mapping.source] = event.source;
        if (mapping.userId && event.userId) {
            mapped[mapping.userId] = event.userId;
        }
        if (mapping.tenantId && event.tenantId) {
            mapped[mapping.tenantId] = event.tenantId;
        }
        if (mapping.ipAddress && event.ipAddress) {
            mapped[mapping.ipAddress] = event.ipAddress;
        }
        if (mapping.userAgent && event.userAgent) {
            mapped[mapping.userAgent] = event.userAgent;
        }
        // Add custom field mappings
        if (mapping.customFields) {
            for (const [targetField, sourceField] of Object.entries(mapping.customFields)) {
                if (event.details[sourceField] !== undefined) {
                    mapped[targetField] = event.details[sourceField];
                }
            }
        }
        return mapped;
    }
    /**
     * Map severity levels to ECS format
     */
    mapSeverityToECS(severity) {
        switch (severity) {
            case 'low':
                return 1;
            case 'medium':
                return 2;
            case 'high':
                return 3;
            case 'critical':
                return 4;
            default:
                return 1;
        }
    }
    /**
     * Map severity levels to Sentinel format
     */
    mapSeverityToSentinel(severity) {
        switch (severity) {
            case 'low':
                return 'Informational';
            case 'medium':
                return 'Warning';
            case 'high':
                return 'Error';
            case 'critical':
                return 'Critical';
            default:
                return 'Informational';
        }
    }
    /**
     * Map severity levels to QRadar format
     */
    mapSeverityToQRadar(severity) {
        switch (severity) {
            case 'low':
                return 3;
            case 'medium':
                return 5;
            case 'high':
                return 7;
            case 'critical':
                return 9;
            default:
                return 3;
        }
    }
    /**
     * Get QRadar event ID based on event type
     */
    getQRadarEventId(eventType) {
        // Map event types to QRadar QIDs
        const qidMap = {
            authentication_failed: 4624,
            authentication_success: 4625,
            data_access: 4656,
            privilege_escalation: 4648,
            suspicious_activity: 1000,
            compliance_violation: 1001,
            dlp_violation: 1002,
        };
        return qidMap[eventType] || 1000;
    }
    /**
     * Get provider status
     */
    getProviderStatus(providerId) {
        const provider = this.providers.get(providerId);
        const circuitBreaker = this.circuitBreakers.get(providerId);
        const buffer = this.eventBuffer.get(providerId);
        return {
            provider: provider
                ? {
                    id: provider.id,
                    name: provider.name,
                    type: provider.type,
                    enabled: provider.enabled,
                }
                : null,
            circuitBreaker: circuitBreaker
                ? {
                    state: circuitBreaker.getState(),
                    failureCount: circuitBreaker.getFailureCount(),
                    lastFailure: circuitBreaker.getLastFailureTime(),
                }
                : null,
            buffer: {
                size: buffer?.length || 0,
                lastFlush: new Date(), // Would track actual last flush time
            },
        };
    }
    /**
     * List all providers
     */
    listProviders() {
        return Array.from(this.providers.values());
    }
    /**
     * Update provider configuration
     */
    updateProvider(providerId, updates) {
        const provider = this.providers.get(providerId);
        if (!provider)
            return false;
        const updatedProvider = { ...provider, ...updates };
        this.providers.set(providerId, updatedProvider);
        logger_js_1.default.info('SIEM provider updated', {
            component: 'SIEMService',
            providerId,
            changes: Object.keys(updates),
        });
        return true;
    }
    /**
     * Test provider connection
     */
    async testProvider(providerId) {
        const provider = this.providers.get(providerId);
        if (!provider)
            return false;
        try {
            const testEvent = {
                timestamp: new Date(),
                eventType: 'connection_test',
                severity: 'low',
                source: 'intelgraph_siem_service',
                message: 'SIEM connection test',
                details: { test: true },
            };
            const batch = {
                id: `test-${Date.now()}`,
                providerId,
                events: [testEvent],
                createdAt: new Date(),
                status: 'pending',
                attempts: 0,
            };
            await this.sendBatch(batch);
            return true;
        }
        catch (error) {
            logger_js_1.default.error('SIEM provider test failed', {
                component: 'SIEMService',
                providerId,
                error: error.message,
            });
            return false;
        }
    }
    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        logger_js_1.default.info('Shutting down SIEM service', {
            component: 'SIEMService',
        });
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
        }
        // Flush all remaining buffers
        for (const providerId of this.eventBuffer.keys()) {
            await this.flushBuffer(providerId);
        }
    }
}
exports.siemService = new SIEMService();
exports.default = exports.siemService;
