
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SubscriptionService } from '../SubscriptionService';
import { QuotaManager } from '../../lib/resources/quota-manager';

jest.mock('../../provenance/ledger', () => ({
    provenanceLedger: {
        appendEntry: jest.fn<any>().mockResolvedValue({})
    }
}), { virtual: true });

jest.mock('../../config/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}), { virtual: true });

// Mock persistence
jest.mock('../persistence/SubscriptionPersistence', () => ({
    subscriptionPersistence: {
        upsertSubscription: jest.fn(),
        initializeSchema: jest.fn(),
        getAllSubscriptions: jest.fn()
    }
}), { virtual: true });

import { provenanceLedger } from '../../provenance/ledger';

describe('SubscriptionService', () => {
    let service: SubscriptionService;
    let quotaManager: QuotaManager;
    let persistenceMock: any;

    beforeEach(async () => {
        jest.clearAllMocks();

        const mod = await import('../persistence/SubscriptionPersistence');
        persistenceMock = mod.subscriptionPersistence;

        service = SubscriptionService.getInstance();
        quotaManager = QuotaManager.getInstance();
        quotaManager.setTenantTier('test-tenant', 'FREE');
    });

    it('should initialize and hydrate QuotaManager', async () => {
        // Mock persistence response, explicit casting to any to avoid generic inference issues with mocked functions
        (persistenceMock.getAllSubscriptions as jest.Mock<any>).mockResolvedValue([
            { tenantId: 'tenant-1', tier: 'PRO' },
            { tenantId: 'tenant-2', tier: 'ENTERPRISE' }
        ]);

        await service.initialize();

        expect(persistenceMock.initializeSchema).toHaveBeenCalled();
        expect(persistenceMock.getAllSubscriptions).toHaveBeenCalled();

        expect(quotaManager.getQuotaForTenant('tenant-1').tier).toBe('PRO');
        expect(quotaManager.getQuotaForTenant('tenant-2').tier).toBe('ENTERPRISE');
    });

    it('should upgrade a tenant tier, persist it, and log audit', async () => {
        await service.upgradeTier('test-tenant', 'PRO', 'admin-user');

        const quota = quotaManager.getQuotaForTenant('test-tenant');
        expect(quota.tier).toBe('PRO');
        expect(quota.features.sso).toBe(true);

        expect(persistenceMock.upsertSubscription).toHaveBeenCalledWith('test-tenant', 'PRO');

        expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                actionType: 'SUBSCRIPTION_CHANGE',
                payload: expect.objectContaining({
                    changeType: 'UPGRADE',
                    newTier: 'PRO',
                    oldTier: 'FREE'
                })
            })
        );
    });

    it('should downgrade a tenant tier, persist it, and log audit', async () => {
        quotaManager.setTenantTier('test-tenant', 'PRO');

        await service.downgradeTier('test-tenant', 'CORE', 'admin-user');

        const quota = quotaManager.getQuotaForTenant('test-tenant');
        expect(quota.tier).toBe('CORE');
        expect(quota.features.sso).toBe(false);

        expect(persistenceMock.upsertSubscription).toHaveBeenCalledWith('test-tenant', 'CORE');

        expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                actionType: 'SUBSCRIPTION_CHANGE',
                payload: expect.objectContaining({
                    changeType: 'DOWNGRADE',
                    newTier: 'CORE',
                    oldTier: 'PRO'
                })
            })
        );
    });

    it('should provide pricing signals', () => {
        quotaManager.setTenantTier('test-tenant', 'ENTERPRISE');
        const signals = service.getPricingSignal('test-tenant');

        expect(signals.tier).toBe('ENTERPRISE');
        expect(signals.limits.storageLimitBytes).toBeGreaterThan(1000);
        expect(signals.limits.features.auditLogsRetentionDays).toBe(365);
    });

    it('should correctly check entitlements', () => {
        quotaManager.setTenantTier('test-tenant', 'PRO');
        expect(service.checkEntitlement('test-tenant', 'sso')).toBe(true);
        expect(service.checkEntitlement('test-tenant', 'advanced_graph')).toBe(true);

        quotaManager.setTenantTier('test-tenant', 'CORE');
        expect(service.checkEntitlement('test-tenant', 'sso')).toBe(false);
    });
});
