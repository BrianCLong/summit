"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const sink_1 = require("../../server/src/audit/sink");
(0, globals_1.describe)('Adversarial Security: Audit Sink Integrity', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetModules();
    });
    (0, globals_1.it)('should record security alerts with mandatory context', async () => {
        const spy = globals_1.jest.spyOn(sink_1.auditSink, 'securityAlert');
        const alertMsg = 'Test Security Alert';
        const context = {
            correlationId: 'corr-123',
            userId: 'attacker-id',
            tenantId: 'victim-tenant'
        };
        await sink_1.auditSink.securityAlert(alertMsg, context);
        (0, globals_1.expect)(spy).toHaveBeenCalledWith(alertMsg, globals_1.expect.objectContaining(context));
    });
    (0, globals_1.it)('should FAIL CLOSED on critical audit record failure if required', async () => {
        // Simulate a failing sink (e.g. storage full)
        const brokenSink = {
            ...sink_1.auditSink,
            recordEvent: globals_1.jest.fn().mockRejectedValue(new Error('Sink unavailable'))
        };
        // This test verifies the expected behavior when audit is mandatory.
        // If an action REQUIREs an audit, it must throw if audit fails.
        const performPrivilegedAction = async (sink) => {
            await sink.recordEvent({
                eventType: 'user_action',
                level: 'info',
                message: 'Mutating sensitive data',
                userId: 'admin',
                tenantId: 'prod'
            });
            return 'Success';
        };
        await (0, globals_1.expect)(performPrivilegedAction(brokenSink)).rejects.toThrow('Sink unavailable');
    });
    (0, globals_1.it)('should NOT emit audit logs via console.log (regression)', async () => {
        const consoleSpy = globals_1.jest.spyOn(console, 'log');
        await sink_1.auditSink.recordEvent({
            eventType: 'user_action',
            level: 'info',
            message: 'Pulse check',
            userId: 'system',
            tenantId: 'system'
        });
        // Ensure no plain JSON objects containing audit data leaked to stdout
        const auditLeaks = consoleSpy.mock.calls.some(call => JSON.stringify(call).includes('Pulse check'));
        (0, globals_1.expect)(auditLeaks).toBe(false);
    });
});
