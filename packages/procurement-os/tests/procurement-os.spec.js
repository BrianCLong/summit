"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const src_1 = require("../src");
const baseIntake = {
    owner: 'owner@example.com',
    useCase: 'Analytics',
    problemStatement: 'Need analytics platform',
    roiModel: 'ROI payback in 6 months',
    spendEstimate: 75000,
    spendCurrency: 'USD',
    capex: 20000,
    opex: 55000,
    termMonths: 12,
    dataCategories: ['pii'],
    dataFlows: ['CRM -> vendor'],
    integrationNeeds: ['SSO', 'Data feed'],
    renewalDate: (0, date_fns_1.addDays)(new Date(), 60).toISOString(),
    noticeDate: (0, date_fns_1.addDays)(new Date(), 30).toISOString(),
    seatsRequested: 50,
    preferredVendor: false,
    vendorName: 'DataVendor',
    existingOverlapCategory: 'analytics',
    criticality: 'customer-impacting',
    apiAccess: true,
    handlesProductionTraffic: true,
    hasSSO: false,
    estimatedUsers: 40,
};
describe('IntakeValidator', () => {
    it('validates required fields and ROI', () => {
        const validator = new src_1.IntakeValidator();
        expect(() => validator.validate({ ...baseIntake, roiModel: 'ROI positive' })).not.toThrow();
    });
    it('rejects missing fields', () => {
        const validator = new src_1.IntakeValidator();
        expect(() => validator.validate({ owner: 'missing' })).toThrow('Intake missing required fields');
    });
});
describe('RiskTieringEngine', () => {
    it('escalates to Tier 0 for production traffic', () => {
        const tiering = new src_1.RiskTieringEngine();
        const tier = tiering.calculateTier({ ...baseIntake, handlesProductionTraffic: true });
        expect(tier).toBe(0);
    });
    it('assigns Tier 1 for PII without production traffic', () => {
        const tiering = new src_1.RiskTieringEngine();
        const tier = tiering.calculateTier({ ...baseIntake, handlesProductionTraffic: false });
        expect(tier).toBe(1);
    });
});
describe('SpendGate and WorkflowRouter', () => {
    it('builds approval path and routing assignments', () => {
        const tiering = new src_1.RiskTieringEngine();
        const spendGate = new src_1.SpendGate();
        const router = new src_1.WorkflowRouter();
        const tier = tiering.calculateTier(baseIntake);
        const approvals = spendGate.evaluate(baseIntake, tier);
        const routing = router.route(baseIntake, approvals, tier);
        expect(approvals.requiresExecutiveSignoff).toBe(true);
        expect(routing.find((r) => r.team === 'Security')).toBeDefined();
        expect(routing.find((r) => r.team === 'Legal')).toBeDefined();
    });
});
describe('VRMService', () => {
    it('blocks completion when high severity remediation open', () => {
        const vrm = new src_1.VRMService();
        vrm.startAssessment('VendorA', 1, 'standard');
        vrm.addRemediation('VendorA', {
            id: 'rem-1',
            description: 'Enable MFA',
            severity: 'high',
            dueDate: (0, date_fns_1.addDays)(new Date(), -1),
        });
        expect(() => vrm.markCompleted('VendorA')).toThrow('Cannot complete VRM');
    });
    it('escalates overdue remediation tasks', () => {
        const vrm = new src_1.VRMService();
        vrm.startAssessment('VendorB', 2, 'lite');
        vrm.addRemediation('VendorB', {
            id: 'rem-2',
            description: 'Update subprocessor list',
            severity: 'medium',
            dueDate: (0, date_fns_1.addDays)(new Date(), -2),
        });
        const escalated = vrm.escalateOverdueRemediations();
        expect(escalated[0].escalationLevel).toBe(1);
        expect(escalated[0].status).toBe('in_progress');
    });
});
describe('ExceptionRegistry and payment enforcement', () => {
    it('enforces no PO/no pay without valid exception', () => {
        const engine = new src_1.ProcurementEngine();
        const decision = engine.evaluatePayment({ vendor: 'X', amount: 1000, currency: 'USD' });
        expect(decision.approved).toBe(false);
    });
    it('approves payment when exception is active', () => {
        const engine = new src_1.ProcurementEngine();
        const validUntil = (0, date_fns_1.addDays)(new Date(), 5);
        engine.registerException({
            id: 'exc-1',
            description: 'Pilot purchase',
            expiresAt: validUntil,
            owner: 'finance',
            compensatingControls: ['budget cap'],
        });
        const decision = engine.evaluatePayment({
            vendor: 'X',
            amount: 1000,
            currency: 'USD',
            exceptionId: 'exc-1',
        });
        expect(decision.approved).toBe(true);
    });
});
describe('RenewalCalendar', () => {
    it('tracks negotiation windows before renewal', () => {
        const calendar = new src_1.RenewalCalendar();
        const renewalDate = (0, date_fns_1.addDays)(new Date(), 45);
        const noticeDate = (0, date_fns_1.addDays)(new Date(), 30);
        calendar.addEvent({
            vendor: 'RenewVendor',
            renewalDate,
            noticeDate,
            negotiationWindowStart: (0, date_fns_1.addDays)(noticeDate, -14),
            owner: 'owner@example.com',
            autoRenew: true,
        });
        const windows = calendar.negotiationWindows((0, date_fns_1.addDays)(new Date(), 20));
        expect(windows.length).toBe(1);
    });
});
describe('ScorecardService', () => {
    it('returns retire recommendation for low scores', () => {
        const scorecards = new src_1.ScorecardService();
        const scorecard = scorecards.buildScorecard('VendorLow', {
            spend: 100000,
            usage: 10,
            reliability: 30,
            risk: 90,
            businessValue: 20,
            tier: 1,
        });
        expect(scorecard.renewalRecommendation).toBe('retire');
    });
});
describe('ProcurementEngine integration', () => {
    it('captures policy violations and routing from intake', () => {
        const engine = new src_1.ProcurementEngine();
        const decision = engine.createIntake(baseIntake);
        expect(decision.policyViolations).toEqual(expect.arrayContaining([
            'SSO missing; must be configured before go-live',
            'Non-preferred vendor requires approved exception',
            'Overlapping category requires decommissioning plan',
            'Seat request exceeds estimated users; enforce seat hygiene',
        ]));
        expect(decision.routing.some((route) => route.team === 'Security')).toBe(true);
    });
});
