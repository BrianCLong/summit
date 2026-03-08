"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const src_1 = require("../src");
describe('tiering and segmentation', () => {
    it('scores partners using weighted rubric and maps to segments', () => {
        const score = (0, src_1.scoreTier)({
            revenueInfluence: 5,
            deliveryQuality: 4,
            securityPosture: 4,
            supportMaturity: 3,
        });
        const segment = (0, src_1.determineSegment)(score);
        expect(score.normalizedScore).toBeGreaterThanOrEqual(4);
        expect(segment).toBe(src_1.PartnerSegment.STRATEGIC);
    });
});
describe('deal registration enforcement', () => {
    it('expires inactive registrations and resolves ownership by tier then time', () => {
        const book = new src_1.DealRegistrationBook();
        const regA = book.register('p1', src_1.PartnerSegment.GROWTH, 3.1, 1);
        const regB = book.register('p1', src_1.PartnerSegment.STRATEGIC, 4.5, 1);
        const owner = book.resolveOwnership([regA, regB]);
        expect(owner?.partnerSegment).toBe(src_1.PartnerSegment.STRATEGIC);
        const expired = book.expireInactive(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
        expect(expired).toHaveLength(2);
        expect(book.getActive('p1')).toBeUndefined();
    });
});
describe('onboarding factory', () => {
    it('blocks partners that fail security and tracks time-to-first-success', () => {
        const factory = new src_1.OnboardingFactory();
        const onboarding = factory.startIntake({
            archetype: src_1.PartnerArchetype.PLATFORM,
            legalName: 'Test Partner',
            headquartersCountry: 'US',
            ownershipVerified: true,
            taxInformationCollected: true,
            contacts: [{ role: 'tech', email: 'tech@example.com' }],
            escalationChain: ['vp@example.com'],
        });
        expect(() => factory.applySecurityQuestionnaire(onboarding.intake.partnerId, {
            tier: src_1.PartnerSegment.GROWTH,
            controlsMet: 3,
            controlsTotal: 5,
            failingControls: ['mfa'],
        })).toThrow('Security questionnaire failed');
        const passed = factory.applySecurityQuestionnaire(onboarding.intake.partnerId, {
            tier: src_1.PartnerSegment.GROWTH,
            controlsMet: 5,
            controlsTotal: 5,
            failingControls: [],
        });
        const technical = factory.completeTechnicalChecklist(onboarding.intake.partnerId, {
            sandboxIssued: true,
            apiKeysIssued: true,
            scopesGranted: ['read', 'write'],
            rateLimitPerMinute: 100,
            webhooksConfigured: true,
            replayProtectionEnabled: true,
        });
        const certified = factory.markCertification(onboarding.intake.partnerId, 'passed', new Date(Date.now() + 10 * 60 * 1000));
        const ttfm = factory.timeToFirstSuccessMinutes(onboarding.intake.partnerId);
        expect(ttfm).toBeGreaterThanOrEqual(10);
        expect(passed.security.tier).toBe(src_1.PartnerSegment.GROWTH);
        expect(technical.technical.webhooksConfigured).toBe(true);
        expect(certified.certificationStatus).toBe('passed');
    });
});
describe('integration certification and throttling', () => {
    it('flags missing controls and validates webhook signatures', () => {
        const result = (0, src_1.certifyIntegration)({
            versioningStrategy: 'none',
            pagination: 'none',
            errorModel: 'http-status-only',
            idempotencyKeys: false,
            webhooksSigned: false,
            replayWindowSeconds: 900,
            scopedPermissions: [],
            dependencyScanning: false,
            secretHandling: 'plaintext',
            egressPolicy: 'open',
        });
        expect(result.passed).toBe(false);
        expect(result.violations.length).toBeGreaterThan(3);
        const payload = JSON.stringify({ hello: 'world' });
        const timestamp = Math.floor(Date.now() / 1000);
        const secret = 'super-secret';
        const signature = crypto_1.default.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
        expect((0, src_1.verifySignedWebhook)(payload, timestamp, signature, secret)).toBe(true);
    });
    it('applies adaptive throttling and enforcement ladder', () => {
        const controller = new src_1.AdaptiveTrafficController(1000);
        const decision = controller.adjustQuota(src_1.PartnerSegment.LONG_TAIL, [
            { metric: 'errorRate', value: 0.12, threshold: 0.1, partnerId: 'p1', observedAt: new Date() },
        ]);
        expect(decision.newQuota).toBeLessThan(1000);
        expect(decision.rationale).toContain('throttled');
        const action = (0, src_1.enforcementLadder)({ metric: 'abuse', value: 10, threshold: 5, partnerId: 'p1', observedAt: new Date() });
        expect(action).toBe('terminate');
    });
});
describe('risk, compliance, and monetization controls', () => {
    it('revokes expired access and detects leakage', () => {
        const access = new src_1.AccessReview();
        const expires = new Date(Date.now() + 1000);
        access.issue({
            id: 'grant1',
            partnerId: 'p1',
            issuedAt: new Date(),
            expiresAt: expires,
            scopes: ['read'],
            type: 'service_token',
        });
        expect(access.listActive('p1')).toHaveLength(1);
        const revoked = access.revokeExpired(new Date(Date.now() + 2000));
        expect(revoked).toContain('grant1');
        const leakage = (0, src_1.detectLeakage)({ partnerId: 'p1', apiQuotaPerMinute: 100, activeUsers: 10 }, { partnerId: 'p1', observedRate: 120, userCount: 5 });
        expect(leakage?.reason).toContain('Unmetered');
    });
    it('calculates payouts with audit trail and caps overage by tier', () => {
        const payout = (0, src_1.calculatePayout)([
            { partnerId: 'p1', model: 'rev_share', gross: 10000, sharePercentage: 0.2, refunds: 100, disputes: 50, taxWithholding: 25, occurredAt: new Date() },
        ]);
        expect(payout.net).toBeCloseTo(1825);
        expect(payout.auditTrail[0]).toContain('p1:rev_share');
        const overage = (0, src_1.applyEntitlementOverage)(1000, 'long_tail', 0.5);
        expect(overage).toBe(1100);
    });
    it('tracks weekly scorecard freshness', () => {
        const scorecard = new src_1.PartnerScorecard();
        scorecard.upsert('p1', {
            pipelineSourced: 100000,
            pipelineInfluenced: 50000,
            installs: 25,
            activationRate: 0.7,
            retentionRate: 0.9,
            incidentRate: 0.01,
            nps: 60,
        });
        expect(scorecard.isStale('p1')).toBe(false);
        const stale = scorecard.isStale('p1', new Date(Date.now() + 8 * 24 * 60 * 60 * 1000));
        expect(stale).toBe(true);
    });
});
