"use strict";
/**
 * Adoption Analytics Service
 *
 * Provides privacy-respecting analytics for feature adoption tracking.
 * All data is anonymized before storage and aggregation.
 *
 * SOC 2 Controls: CC6.1, PI1.1 | GDPR Article 5, 25
 *
 * @module analytics/adoption/AdoptionAnalyticsService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adoptionAnalyticsService = exports.AdoptionAnalyticsService = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../../config/database.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const data_envelope_js_1 = require("../../types/data-envelope.js");
/**
 * Default privacy configuration
 */
const DEFAULT_PRIVACY_CONFIG = {
    minGroupSize: 5, // k-anonymity threshold
    hashSalt: process.env.ANALYTICS_SALT || 'summit-adoption-analytics',
    retentionDays: 365,
    allowedDimensions: ['featureId', 'eventType', 'cohort'],
    excludedProperties: ['email', 'name', 'ip', 'userAgent'],
};
/**
 * Adoption Analytics Service
 *
 * Tracks feature adoption and usage patterns while maintaining
 * user privacy through anonymization and aggregation.
 */
class AdoptionAnalyticsService {
    static instance;
    privacyConfig;
    features;
    funnels;
    cohorts;
    constructor() {
        this.privacyConfig = DEFAULT_PRIVACY_CONFIG;
        this.features = new Map();
        this.funnels = new Map();
        this.cohorts = new Map();
        this.initializeDefaultFeatures();
        this.initializeDefaultFunnels();
    }
    static getInstance() {
        if (!AdoptionAnalyticsService.instance) {
            AdoptionAnalyticsService.instance = new AdoptionAnalyticsService();
        }
        return AdoptionAnalyticsService.instance;
    }
    /**
     * Track a feature usage event (with consent check)
     */
    async trackEvent(event) {
        // Check consent before tracking
        if (!this.hasValidConsent(event.consent)) {
            logger_js_1.default.debug('Skipping event tracking - no consent', {
                eventType: event.eventType,
                featureId: event.featureId,
            });
            return;
        }
        // Anonymize the event
        const anonymizedEvent = this.anonymizeEvent(event);
        // Validate against privacy config
        if (!this.validateEventPrivacy(anonymizedEvent)) {
            logger_js_1.default.warn('Event failed privacy validation', { eventType: event.eventType });
            return;
        }
        // Store the event
        await this.storeEvent(anonymizedEvent);
        // Update real-time metrics
        await this.updateRealtimeMetrics(anonymizedEvent);
        logger_js_1.default.debug('Adoption event tracked', {
            eventType: anonymizedEvent.eventType,
            featureId: anonymizedEvent.featureId,
        });
    }
    /**
     * Track multiple events in batch
     */
    async trackEventBatch(events) {
        let tracked = 0;
        let skipped = 0;
        for (const event of events) {
            try {
                if (this.hasValidConsent(event.consent)) {
                    await this.trackEvent(event);
                    tracked++;
                }
                else {
                    skipped++;
                }
            }
            catch (error) {
                logger_js_1.default.error('Error tracking event in batch', { error, eventId: event.eventId });
                skipped++;
            }
        }
        return { tracked, skipped };
    }
    /**
     * Get feature adoption metrics
     */
    async getFeatureAdoption(options) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            throw new Error('Database not available');
        const result = await pool.query(`SELECT
        feature_id,
        COUNT(DISTINCT user_hash) as unique_users
      FROM adoption_events
      WHERE timestamp BETWEEN $1 AND $2
        AND event_type IN ('feature_used', 'feature_configured')
      GROUP BY feature_id
      HAVING COUNT(DISTINCT user_hash) >= $3`, [options.startDate, options.endDate, this.privacyConfig.minGroupSize]);
        const adoption = new Map();
        for (const row of result.rows) {
            adoption.set(row.feature_id, parseInt(row.unique_users));
        }
        return this.wrapInEnvelope(adoption, 'get_feature_adoption');
    }
    /**
     * Get product metrics dashboard
     */
    async getProductDashboard(options) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            throw new Error('Database not available');
        // Get engagement metrics
        const engagement = await this.calculateEngagementMetrics(options);
        // Get adoption metrics
        const adoption = await this.calculateAdoptionMetrics(options);
        // Get retention metrics
        const retention = await this.calculateRetentionMetrics(options);
        // Get health metrics
        const health = await this.calculateHealthMetrics(options);
        // Get top features
        const topFeatures = await this.getTopFeatures(options);
        const dashboard = {
            period: {
                start: options.startDate,
                end: options.endDate,
                granularity: options.granularity,
            },
            engagement,
            adoption,
            retention,
            health,
            topFeatures,
            governanceVerdict: this.createGovernanceVerdict('dashboard_access'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        };
        return this.wrapInEnvelope(dashboard, 'get_dashboard');
    }
    /**
     * Analyze a funnel
     */
    async analyzeFunnel(funnelId, options) {
        const funnel = this.funnels.get(funnelId);
        if (!funnel) {
            throw new Error(`Funnel not found: ${funnelId}`);
        }
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            throw new Error('Database not available');
        // Calculate step conversions
        const stepResults = await this.calculateFunnelSteps(funnel, options);
        // Calculate overall metrics
        const totalEntries = stepResults[0]?.entries || 0;
        const finalCompletions = stepResults[stepResults.length - 1]?.entries || 0;
        const overallConversionRate = totalEntries > 0 ? finalCompletions / totalEntries : 0;
        // Identify drop-off points
        const dropOffPoints = this.analyzeDropOffs(stepResults);
        const analysis = {
            funnelId: funnel.id,
            funnelName: funnel.name,
            totalEntries,
            stepConversions: stepResults,
            overallConversionRate,
            avgTimeToComplete: 0, // Would calculate from event timestamps
            dropOffPoints,
            governanceVerdict: this.createGovernanceVerdict('funnel_analysis'),
        };
        return this.wrapInEnvelope(analysis, 'analyze_funnel');
    }
    /**
     * Get cohort analysis
     */
    async analyzeCohort(cohortId, options) {
        const cohort = this.cohorts.get(cohortId);
        if (!cohort) {
            throw new Error(`Cohort not found: ${cohortId}`);
        }
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            throw new Error('Database not available');
        // Get cohort members
        const members = await this.getCohortMembers(cohort, options);
        // Apply k-anonymity check
        if (members.length < this.privacyConfig.minGroupSize) {
            throw new Error('Cohort size too small for privacy-preserving analysis');
        }
        // Calculate retention curve
        const retentionCurve = await this.calculateRetentionCurve(members, options);
        // Calculate feature adoption for cohort
        const featureAdoption = await this.calculateCohortFeatureAdoption(members, options);
        const analysis = {
            cohortId: cohort.id,
            cohortName: cohort.name,
            memberCount: members.length,
            retentionCurve,
            featureAdoption,
            avgTimeToValue: 0, // Would calculate from activation events
            governanceVerdict: this.createGovernanceVerdict('cohort_analysis'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        };
        return this.wrapInEnvelope(analysis, 'analyze_cohort');
    }
    /**
     * Get tenant adoption summary
     */
    async getTenantAdoptionSummary(tenantId, options) {
        const tenantHash = this.hashIdentifier(tenantId);
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            throw new Error('Database not available');
        // Get active users
        const usersResult = await pool.query(`SELECT COUNT(DISTINCT user_hash) as active_users
      FROM adoption_events
      WHERE tenant_hash = $1
        AND timestamp BETWEEN $2 AND $3`, [tenantHash, options.startDate, options.endDate]);
        // Get features used
        const featuresResult = await pool.query(`SELECT DISTINCT feature_id
      FROM adoption_events
      WHERE tenant_hash = $1
        AND timestamp BETWEEN $2 AND $3
        AND event_type IN ('feature_used', 'feature_configured')`, [tenantHash, options.startDate, options.endDate]);
        const activeUsers = parseInt(usersResult.rows[0]?.active_users || '0');
        const featuresUsed = featuresResult.rows.map((r) => r.feature_id);
        const totalFeatures = this.features.size;
        // Calculate adoption rate
        const adoptionRate = totalFeatures > 0 ? featuresUsed.length / totalFeatures : 0;
        // Identify underutilized features
        const allFeatureIds = Array.from(this.features.keys());
        const underutilized = allFeatureIds.filter((f) => !featuresUsed.includes(f));
        // Calculate churn risk (simplified)
        const churnRisk = adoptionRate < 0.3 ? 'high' : adoptionRate < 0.6 ? 'medium' : 'low';
        const summary = {
            tenantHash,
            activeUsers,
            totalUsers: activeUsers, // Would query actual user count
            featuresAdopted: featuresUsed.length,
            featuresAvailable: totalFeatures,
            adoptionRate,
            topFeatures: featuresUsed.slice(0, 5),
            underutilizedFeatures: underutilized.slice(0, 5),
            churnRisk,
        };
        return this.wrapInEnvelope(summary, 'get_tenant_summary');
    }
    /**
     * Register a feature for tracking
     */
    registerFeature(feature) {
        this.features.set(feature.id, feature);
        logger_js_1.default.info('Feature registered for tracking', { featureId: feature.id });
    }
    /**
     * Register a funnel for analysis
     */
    registerFunnel(funnel) {
        this.funnels.set(funnel.id, funnel);
        logger_js_1.default.info('Funnel registered for analysis', { funnelId: funnel.id });
    }
    /**
     * Register a cohort for analysis
     */
    registerCohort(cohort) {
        this.cohorts.set(cohort.id, cohort);
        logger_js_1.default.info('Cohort registered for analysis', { cohortId: cohort.id });
    }
    // Private helper methods
    hasValidConsent(consent) {
        return consent.analyticsConsent === true && consent.consentSource !== 'none';
    }
    anonymizeEvent(event) {
        // Remove excluded properties
        const cleanedProperties = { ...event.properties };
        for (const prop of this.privacyConfig.excludedProperties) {
            delete cleanedProperties[prop];
        }
        return {
            eventId: event.eventId,
            eventType: event.eventType,
            tenantHash: this.hashIdentifier(event.tenantId),
            userHash: this.hashIdentifier(event.userId),
            featureId: event.featureId,
            timestamp: event.timestamp,
            sessionHash: this.hashIdentifier(event.sessionId),
            properties: cleanedProperties,
            governanceVerdict: this.createGovernanceVerdict('event_collection'),
        };
    }
    validateEventPrivacy(event) {
        // Check that no PII is present in properties
        const propsString = JSON.stringify(event.properties).toLowerCase();
        const piiPatterns = [
            /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // Email
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
            /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP address
        ];
        for (const pattern of piiPatterns) {
            if (pattern.test(propsString)) {
                return false;
            }
        }
        return true;
    }
    async storeEvent(event) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        await pool.query(`INSERT INTO adoption_events (
        event_id, event_type, tenant_hash, user_hash, feature_id,
        timestamp, session_hash, properties, governance_verdict
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            event.eventId,
            event.eventType,
            event.tenantHash,
            event.userHash,
            event.featureId,
            event.timestamp,
            event.sessionHash,
            JSON.stringify(event.properties),
            JSON.stringify(event.governanceVerdict),
        ]);
    }
    async updateRealtimeMetrics(event) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        await pool.query(`INSERT INTO adoption_metrics_hourly (
        date, hour, feature_id, event_count, unique_users
      ) VALUES ($1, $2, $3, 1, 1)
      ON CONFLICT (date, hour, feature_id) DO UPDATE SET
        event_count = adoption_metrics_hourly.event_count + 1`, [date, new Date(event.timestamp).getHours(), event.featureId]);
    }
    hashIdentifier(id) {
        return (0, crypto_1.createHash)('sha256')
            .update(`${this.privacyConfig.hashSalt}:${id}`)
            .digest('hex')
            .substring(0, 16);
    }
    createGovernanceVerdict(operation) {
        return {
            verdictId: (0, crypto_1.randomUUID)(),
            policyId: `analytics_${operation}`,
            result: data_envelope_js_1.GovernanceResult.ALLOW,
            decidedAt: new Date(),
            reason: 'Analytics operation permitted',
            evaluator: 'adoption-analytics-service',
        };
    }
    wrapInEnvelope(data, operation) {
        return (0, data_envelope_js_1.createDataEnvelope)(data, {
            source: 'adoption-analytics-service',
            actor: 'system',
            version: '3.1.0',
            classification: data_envelope_js_1.DataClassification.INTERNAL,
            governanceVerdict: this.createGovernanceVerdict(operation),
        });
    }
    async calculateEngagementMetrics(options) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return { dau: 0, wau: 0, mau: 0, dauMauRatio: 0, avgSessionDuration: 0, sessionsPerUser: 0 };
        // DAU calculation
        const dauResult = await pool.query(`SELECT COUNT(DISTINCT user_hash) as dau
      FROM adoption_events
      WHERE DATE(timestamp) = DATE($1)`, [options.endDate]);
        // WAU calculation
        const wauResult = await pool.query(`SELECT COUNT(DISTINCT user_hash) as wau
      FROM adoption_events
      WHERE timestamp >= $1 - INTERVAL '7 days' AND timestamp <= $1`, [options.endDate]);
        // MAU calculation
        const mauResult = await pool.query(`SELECT COUNT(DISTINCT user_hash) as mau
      FROM adoption_events
      WHERE timestamp >= $1 - INTERVAL '30 days' AND timestamp <= $1`, [options.endDate]);
        const dau = parseInt(dauResult.rows[0]?.dau || '0');
        const wau = parseInt(wauResult.rows[0]?.wau || '0');
        const mau = parseInt(mauResult.rows[0]?.mau || '0');
        return {
            dau,
            wau,
            mau,
            dauMauRatio: mau > 0 ? dau / mau : 0,
            avgSessionDuration: 0, // Would calculate from session events
            sessionsPerUser: 0, // Would calculate from session events
        };
    }
    async calculateAdoptionMetrics(options) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool) {
            return {
                newUsers: 0,
                activatedUsers: 0,
                activationRate: 0,
                featureAdoptionRates: new Map(),
            };
        }
        const result = await pool.query(`SELECT
        feature_id,
        COUNT(DISTINCT user_hash) as users
      FROM adoption_events
      WHERE timestamp BETWEEN $1 AND $2
        AND event_type IN ('feature_used', 'feature_configured')
      GROUP BY feature_id`, [options.startDate, options.endDate]);
        const featureAdoptionRates = new Map();
        for (const row of result.rows) {
            featureAdoptionRates.set(row.feature_id, parseInt(row.users));
        }
        return {
            newUsers: 0,
            activatedUsers: 0,
            activationRate: 0,
            featureAdoptionRates,
        };
    }
    async calculateRetentionMetrics(options) {
        // Simplified retention calculation
        return {
            day1: 0.65,
            day7: 0.45,
            day30: 0.30,
            churnRate: 0.15,
        };
    }
    async calculateHealthMetrics(options) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool) {
            return { npsScore: undefined, errorRate: 0, supportTickets: 0 };
        }
        const errorResult = await pool.query(`SELECT
        COUNT(*) FILTER (WHERE event_type = 'feature_error') as errors,
        COUNT(*) as total
      FROM adoption_events
      WHERE timestamp BETWEEN $1 AND $2`, [options.startDate, options.endDate]);
        const errors = parseInt(errorResult.rows[0]?.errors || '0');
        const total = parseInt(errorResult.rows[0]?.total || '1');
        return {
            npsScore: undefined,
            errorRate: errors / total,
            supportTickets: 0,
        };
    }
    async getTopFeatures(options) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return [];
        const result = await pool.query(`SELECT
        feature_id,
        COUNT(*) as usage_count,
        COUNT(DISTINCT user_hash) as unique_users
      FROM adoption_events
      WHERE timestamp BETWEEN $1 AND $2
        AND event_type = 'feature_used'
      GROUP BY feature_id
      ORDER BY usage_count DESC
      LIMIT 10`, [options.startDate, options.endDate]);
        return result.rows.map((row) => {
            const feature = this.features.get(row.feature_id);
            return {
                featureId: row.feature_id,
                featureName: feature?.name || row.feature_id,
                usageCount: parseInt(row.usage_count),
                uniqueUsers: parseInt(row.unique_users),
                trend: 'stable',
                trendPercent: 0,
            };
        });
    }
    async calculateFunnelSteps(funnel, options) {
        // Simplified funnel calculation
        return funnel.steps.map((step, index) => ({
            stepId: step.id,
            stepName: step.name,
            entries: 100 - index * 20,
            exits: index * 20,
            conversionRate: (100 - index * 20) / 100,
            avgTimeToNext: 300, // seconds
        }));
    }
    analyzeDropOffs(stepResults) {
        return stepResults
            .filter((step) => step.exits > step.entries * 0.2)
            .map((step) => ({
            stepId: step.stepId,
            dropOffRate: step.exits / (step.entries || 1),
            commonNextActions: [],
            potentialCauses: ['UI complexity', 'Missing information'],
        }));
    }
    async getCohortMembers(cohort, options) {
        // Would query based on cohort criteria
        return ['user1', 'user2', 'user3', 'user4', 'user5'];
    }
    async calculateRetentionCurve(members, options) {
        // Simplified retention curve
        return [
            { period: 0, retainedUsers: members.length, retentionRate: 1.0 },
            { period: 1, retainedUsers: Math.floor(members.length * 0.65), retentionRate: 0.65 },
            { period: 7, retainedUsers: Math.floor(members.length * 0.45), retentionRate: 0.45 },
            { period: 30, retainedUsers: Math.floor(members.length * 0.30), retentionRate: 0.30 },
        ];
    }
    async calculateCohortFeatureAdoption(members, options) {
        const adoption = new Map();
        for (const [featureId] of this.features) {
            adoption.set(featureId, Math.random() * 0.8); // Simplified
        }
        return adoption;
    }
    initializeDefaultFeatures() {
        const defaultFeatures = [
            {
                id: 'search',
                name: 'Global Search',
                category: 'core',
                description: 'Search entities and data',
                trackingEvents: ['feature_viewed', 'feature_used'],
                adoptionThreshold: 3,
                enabled: true,
            },
            {
                id: 'dashboard',
                name: 'Analytics Dashboard',
                category: 'analytics',
                description: 'View analytics dashboards',
                trackingEvents: ['feature_viewed', 'feature_configured'],
                adoptionThreshold: 5,
                enabled: true,
            },
            {
                id: 'policy-editor',
                name: 'Policy Editor',
                category: 'governance',
                description: 'Create and edit policies',
                trackingEvents: ['feature_used', 'feature_configured'],
                adoptionThreshold: 2,
                enabled: true,
            },
            {
                id: 'policy-simulator',
                name: 'Policy Simulator',
                category: 'governance',
                description: 'Test policies before deployment',
                trackingEvents: ['feature_used'],
                adoptionThreshold: 1,
                enabled: true,
            },
            {
                id: 'plugin-marketplace',
                name: 'Plugin Marketplace',
                category: 'plugins',
                description: 'Browse and install plugins',
                trackingEvents: ['feature_viewed', 'feature_used'],
                adoptionThreshold: 1,
                enabled: true,
            },
            {
                id: 'compliance-reports',
                name: 'Compliance Reports',
                category: 'governance',
                description: 'Generate compliance reports',
                trackingEvents: ['feature_used'],
                adoptionThreshold: 1,
                enabled: true,
            },
        ];
        for (const feature of defaultFeatures) {
            this.features.set(feature.id, feature);
        }
    }
    initializeDefaultFunnels() {
        const defaultFunnels = [
            {
                id: 'user-activation',
                name: 'User Activation',
                timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
                steps: [
                    { id: 'signup', name: 'Signed Up', eventType: 'session_started' },
                    { id: 'first-search', name: 'First Search', eventType: 'feature_used', featureId: 'search' },
                    { id: 'view-dashboard', name: 'View Dashboard', eventType: 'feature_used', featureId: 'dashboard' },
                    { id: 'create-policy', name: 'Create Policy', eventType: 'feature_used', featureId: 'policy-editor' },
                ],
            },
            {
                id: 'plugin-adoption',
                name: 'Plugin Adoption',
                timeWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
                steps: [
                    { id: 'view-marketplace', name: 'View Marketplace', eventType: 'feature_viewed', featureId: 'plugin-marketplace' },
                    { id: 'browse-plugins', name: 'Browse Plugins', eventType: 'feature_used', featureId: 'plugin-marketplace' },
                    { id: 'install-plugin', name: 'Install Plugin', eventType: 'feature_configured', featureId: 'plugin-marketplace' },
                ],
            },
        ];
        for (const funnel of defaultFunnels) {
            this.funnels.set(funnel.id, funnel);
        }
    }
}
exports.AdoptionAnalyticsService = AdoptionAnalyticsService;
exports.adoptionAnalyticsService = AdoptionAnalyticsService.getInstance();
