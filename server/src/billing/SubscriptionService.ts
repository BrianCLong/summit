import { QuotaManager, Quota } from '../lib/resources/quota-manager';
import { provenanceLedger } from '../provenance/ledger';
import logger from '../config/logger';
import { subscriptionPersistence } from './persistence/SubscriptionPersistence';

export class SubscriptionService {
    private static instance: SubscriptionService;

    private constructor() {}

    public static getInstance(): SubscriptionService {
        if (!SubscriptionService.instance) {
            SubscriptionService.instance = new SubscriptionService();
        }
        return SubscriptionService.instance;
    }

    /**
     * Initializes the service by loading subscriptions from the database into the QuotaManager.
     */
    public async initialize(): Promise<void> {
        // Ensure schema exists
        await subscriptionPersistence.initializeSchema();

        // Hydrate QuotaManager
        const subscriptions = await subscriptionPersistence.getAllSubscriptions();
        const quotaManager = QuotaManager.getInstance();

        for (const sub of subscriptions) {
            // Validate tier string to ensure it matches allowed types
            const tier = sub.tier as 'FREE' | 'CORE' | 'PRO' | 'ENTERPRISE';
            if (['FREE', 'CORE', 'PRO', 'ENTERPRISE'].includes(tier)) {
                quotaManager.setTenantTier(sub.tenantId, tier);
            } else {
                logger.warn({ tenantId: sub.tenantId, tier }, 'Invalid tier found during hydration, skipping.');
            }
        }

        logger.info({ count: subscriptions.length }, 'SubscriptionService: Initialized and hydrated QuotaManager.');
    }

    public async upgradeTier(tenantId: string, newTier: 'FREE' | 'CORE' | 'PRO' | 'ENTERPRISE', actorId: string): Promise<void> {
        const quotaManager = QuotaManager.getInstance();
        const oldTier = quotaManager.getQuotaForTenant(tenantId).tier;

        if (oldTier === newTier) {
            logger.info({ tenantId, tier: newTier }, 'Tenant already on this tier.');
            return;
        }

        // Apply new tier in QuotaManager (Runtime)
        quotaManager.setTenantTier(tenantId, newTier);

        // Persist to DB
        await subscriptionPersistence.upsertSubscription(tenantId, newTier);

        // TODO: Sync with OPA Data Plane
        logger.info({ tenantId, newTier }, 'Synced tier change to OPA (simulated).');

        // Audit Trail
        await provenanceLedger.appendEntry({
            tenantId,
            actionType: 'SUBSCRIPTION_CHANGE',
            resourceType: 'Subscription',
            resourceId: tenantId,
            actorId: actorId,
            actorType: 'user',
            timestamp: new Date(),
            payload: {
                mutationType: 'UPDATE',
                entityId: tenantId,
                entityType: 'Subscription',
                oldTier,
                newTier,
                changeType: 'UPGRADE'
            },
            metadata: {
                tenantId,
                oldTier,
                newTier
            }
        });

        logger.info({ tenantId, oldTier, newTier }, 'Tenant upgraded successfully.');
    }

    public async downgradeTier(tenantId: string, newTier: 'FREE' | 'CORE' | 'PRO' | 'ENTERPRISE', actorId: string): Promise<void> {
        const quotaManager = QuotaManager.getInstance();
        const oldTier = quotaManager.getQuotaForTenant(tenantId).tier;

        // Apply new tier in QuotaManager (Runtime)
        quotaManager.setTenantTier(tenantId, newTier);

        // Persist to DB
        await subscriptionPersistence.upsertSubscription(tenantId, newTier);

        // TODO: Sync with OPA Data Plane
        logger.info({ tenantId, newTier }, 'Synced tier change to OPA (simulated).');

        // Audit Trail
        await provenanceLedger.appendEntry({
            tenantId,
            actionType: 'SUBSCRIPTION_CHANGE',
            resourceType: 'Subscription',
            resourceId: tenantId,
            actorId: actorId,
            actorType: 'user',
            timestamp: new Date(),
            payload: {
                mutationType: 'UPDATE',
                entityId: tenantId,
                entityType: 'Subscription',
                oldTier,
                newTier,
                changeType: 'DOWNGRADE',
                gracePeriod: '30 days'
            },
            metadata: {
                tenantId,
                oldTier,
                newTier
            }
        });

        logger.info({ tenantId, oldTier, newTier }, 'Tenant downgraded successfully.');
    }

    public getPricingSignal(tenantId: string): { tier: string, usage: any, limits: Quota } {
        const quotaManager = QuotaManager.getInstance();
        const limits = quotaManager.getQuotaForTenant(tenantId);

        const usage = {
            requestsPerMinute: 0,
            storageBytes: 0
        };

        return {
            tier: limits.tier,
            usage,
            limits
        };
    }

    public checkEntitlement(tenantId: string, feature: string): boolean {
        const quota = QuotaManager.getInstance().getQuotaForTenant(tenantId);

        switch(feature) {
            case 'sso': return quota.features.sso;
            case 'advanced_graph': return quota.features.advancedGraphAnalytics;
            case 'audit_logs': return quota.features.auditLogsRetentionDays > 7;
            default: return false;
        }
    }
}

export const subscriptionService = SubscriptionService.getInstance();
