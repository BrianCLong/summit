"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const policy_1 = require("../policy");
describe('Memory Policy Evaluator', () => {
    const future = Date.now() + 10000;
    const past = Date.now() - 10000;
    const validRecord = {
        userId: 'user123',
        purpose: 'assist',
        contextSpace: 'personal',
        expiresAt: future,
    };
    test('should allow read when userId, purpose and context match and not expired', () => {
        const scope = { userId: 'user123', purpose: 'assist', contextSpace: 'personal' };
        expect((0, policy_1.canRead)(scope, validRecord).allow).toBe(true);
    });
    test('should deny read when userId mismatches', () => {
        const scope = { userId: 'attacker', purpose: 'assist', contextSpace: 'personal' };
        const decision = (0, policy_1.canRead)(scope, validRecord);
        expect(decision.allow).toBe(false);
        expect(decision.reason).toBe('user_mismatch');
    });
    test('should deny read when purpose mismatches', () => {
        const scope = { userId: 'user123', purpose: 'billing', contextSpace: 'personal' };
        const decision = (0, policy_1.canRead)(scope, validRecord);
        expect(decision.allow).toBe(false);
        expect(decision.reason).toBe('purpose_mismatch');
    });
    test('should deny read when context mismatches', () => {
        const scope = { userId: 'user123', purpose: 'assist', contextSpace: 'work' };
        const decision = (0, policy_1.canRead)(scope, validRecord);
        expect(decision.allow).toBe(false);
        expect(decision.reason).toBe('context_mismatch');
    });
    test('should deny read when expired', () => {
        const scope = { userId: 'user123', purpose: 'assist', contextSpace: 'personal' };
        const expiredRecord = { ...validRecord, expiresAt: past };
        const decision = (0, policy_1.canRead)(scope, expiredRecord);
        expect(decision.allow).toBe(false);
        expect(decision.reason).toBe('expired');
    });
    test('should deny write when purpose is missing', () => {
        const decision = (0, policy_1.canWrite)({ contextSpace: 'personal', expiresAt: future });
        expect(decision.allow).toBe(false);
        expect(decision.reason).toBe('missing_purpose');
    });
});
