"use strict";
/**
 * Tests for audit logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
const audit_js_1 = require("../utils/audit.js");
const api_client_js_1 = require("../utils/api-client.js");
describe('Audit Logging', () => {
    describe('createAuditor', () => {
        it('should create auditor with enabled flag', () => {
            const auditor = (0, audit_js_1.createAuditor)({ enabled: true });
            expect(auditor).toHaveProperty('record');
        });
        it('should create auditor with API client', () => {
            const apiClient = (0, api_client_js_1.createMockApiClient)();
            const auditor = (0, audit_js_1.createAuditor)({
                enabled: true,
                apiClient,
            });
            expect(auditor).toHaveProperty('record');
        });
        it('should skip recording when disabled', async () => {
            const auditor = (0, audit_js_1.createAuditor)({ enabled: false });
            // Should not throw
            await auditor.record({
                action: 'test.action',
                command: 'test',
                args: [],
                options: {},
                userId: 'user1',
                result: 'success',
            });
        });
        it('should record event when enabled', async () => {
            const apiClient = (0, api_client_js_1.createMockApiClient)();
            const auditor = (0, audit_js_1.createAuditor)({
                enabled: true,
                apiClient,
            });
            // Should not throw
            await auditor.record({
                action: 'test.action',
                command: 'test',
                args: ['arg1', 'arg2'],
                options: { flag: true },
                userId: 'user1',
                result: 'success',
            });
        });
        it('should redact sensitive options', async () => {
            const apiClient = (0, api_client_js_1.createMockApiClient)();
            const auditor = (0, audit_js_1.createAuditor)({
                enabled: true,
                apiClient,
            });
            // Should not throw and should redact token
            await auditor.record({
                action: 'test.action',
                command: 'test',
                args: [],
                options: {
                    token: 'secret-token',
                    password: 'secret-password',
                    normalOption: 'visible',
                },
                userId: 'user1',
                result: 'success',
            });
        });
    });
    describe('createAuditContext', () => {
        it('should create context with command info', () => {
            const context = (0, audit_js_1.createAuditContext)('tenant', ['create'], {
                name: 'Acme Corp',
            });
            expect(context.command).toBe('tenant');
            expect(context.args).toEqual(['create']);
            expect(context.options).toEqual({ name: 'Acme Corp' });
        });
        it('should redact sensitive options in context', () => {
            const context = (0, audit_js_1.createAuditContext)('security', ['rotate-keys'], {
                token: 'secret',
                force: true,
            });
            expect(context.options.token).toBe('[REDACTED]');
            expect(context.options.force).toBe(true);
        });
        it('should handle nested sensitive options', () => {
            const context = (0, audit_js_1.createAuditContext)('config', ['set'], {
                nested: {
                    apiKey: 'secret-key',
                    visible: 'yes',
                },
            });
            expect(context.options.nested.apiKey).toBe('[REDACTED]');
            expect(context.options.nested.visible).toBe('yes');
        });
    });
});
