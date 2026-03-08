"use strict";
/**
 * Tests for confirmation utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
const confirm_js_1 = require("../utils/confirm.js");
describe('Confirmation Utilities', () => {
    describe('CONFIRMATION_PHRASES', () => {
        it('should have DELETE phrase', () => {
            expect(confirm_js_1.CONFIRMATION_PHRASES.DELETE).toBe('I understand this will delete data');
        });
        it('should have SUSPEND phrase', () => {
            expect(confirm_js_1.CONFIRMATION_PHRASES.SUSPEND).toBe('I understand this will suspend the tenant');
        });
        it('should have ROTATE phrase', () => {
            expect(confirm_js_1.CONFIRMATION_PHRASES.ROTATE).toBe('I understand this will rotate keys');
        });
        it('should have FORCE phrase', () => {
            expect(confirm_js_1.CONFIRMATION_PHRASES.FORCE).toBe('I understand this is a destructive operation');
        });
        it('should have PRODUCTION phrase', () => {
            expect(confirm_js_1.CONFIRMATION_PHRASES.PRODUCTION).toBe('I understand this affects production');
        });
    });
    describe('isInteractive', () => {
        it('should return boolean', () => {
            const result = (0, confirm_js_1.isInteractive)();
            expect(typeof result).toBe('boolean');
        });
    });
});
