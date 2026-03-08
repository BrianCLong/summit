"use strict";
/**
 * Targeting Utilities Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const targeting_1 = require("../utils/targeting");
describe('Targeting Utilities', () => {
    const context = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userRole: 'admin',
        tenantId: 'tenant-1',
        environment: 'production',
        attributes: {
            plan: 'premium',
            accountAge: 90,
        },
    };
    describe('evaluateCondition', () => {
        it('should evaluate equals operator', () => {
            const condition = {
                attribute: 'userId',
                operator: 'equals',
                value: 'user-123',
            };
            expect((0, targeting_1.evaluateCondition)(condition, context)).toBe(true);
        });
        it('should evaluate not_equals operator', () => {
            const condition = {
                attribute: 'userId',
                operator: 'not_equals',
                value: 'user-456',
            };
            expect((0, targeting_1.evaluateCondition)(condition, context)).toBe(true);
        });
        it('should evaluate in operator', () => {
            const condition = {
                attribute: 'userId',
                operator: 'in',
                value: ['user-123', 'user-456'],
            };
            expect((0, targeting_1.evaluateCondition)(condition, context)).toBe(true);
        });
        it('should evaluate greater_than operator', () => {
            const condition = {
                attribute: 'accountAge',
                operator: 'greater_than',
                value: 30,
            };
            expect((0, targeting_1.evaluateCondition)(condition, context)).toBe(true);
        });
        it('should evaluate contains operator', () => {
            const condition = {
                attribute: 'userEmail',
                operator: 'contains',
                value: '@example.com',
            };
            expect((0, targeting_1.evaluateCondition)(condition, context)).toBe(true);
        });
        it('should handle negation', () => {
            const condition = {
                attribute: 'userId',
                operator: 'equals',
                value: 'user-123',
                negate: true,
            };
            expect((0, targeting_1.evaluateCondition)(condition, context)).toBe(false);
        });
        it('should return false for missing attributes', () => {
            const condition = {
                attribute: 'missingAttr',
                operator: 'equals',
                value: 'test',
            };
            expect((0, targeting_1.evaluateCondition)(condition, context)).toBe(false);
        });
    });
    describe('evaluateRule', () => {
        it('should evaluate rule with all conditions true', () => {
            const rule = {
                id: 'test-rule',
                conditions: [
                    { attribute: 'userId', operator: 'equals', value: 'user-123' },
                    { attribute: 'environment', operator: 'equals', value: 'production' },
                ],
                variation: 'enabled',
            };
            expect((0, targeting_1.evaluateRule)(rule, context)).toBe(true);
        });
        it('should fail rule if any condition is false', () => {
            const rule = {
                id: 'test-rule',
                conditions: [
                    { attribute: 'userId', operator: 'equals', value: 'user-123' },
                    { attribute: 'environment', operator: 'equals', value: 'staging' },
                ],
                variation: 'enabled',
            };
            expect((0, targeting_1.evaluateRule)(rule, context)).toBe(false);
        });
    });
    describe('helper functions', () => {
        it('should create userId targeting condition', () => {
            const condition = (0, targeting_1.targetUserId)(['user-1', 'user-2']);
            expect(condition).toEqual({
                attribute: 'userId',
                operator: 'in',
                value: ['user-1', 'user-2'],
                negate: false,
            });
        });
        it('should create role targeting condition', () => {
            const condition = (0, targeting_1.targetRole)(['admin', 'moderator']);
            expect(condition).toEqual({
                attribute: 'userRole',
                operator: 'in',
                value: ['admin', 'moderator'],
                negate: false,
            });
        });
        it('should create environment targeting condition', () => {
            const condition = (0, targeting_1.targetEnvironment)(['production']);
            expect(condition).toEqual({
                attribute: 'environment',
                operator: 'in',
                value: ['production'],
                negate: false,
            });
        });
    });
});
