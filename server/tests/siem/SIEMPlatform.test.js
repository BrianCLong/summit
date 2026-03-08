"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SIEMPlatform_js_1 = require("../../src/siem/SIEMPlatform.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('SIEMPlatform', () => {
    (0, globals_1.beforeEach)(() => {
        SIEMPlatform_js_1.siemPlatform.reset();
    });
    (0, globals_1.it)('should ingest an event', async () => {
        const event = await SIEMPlatform_js_1.siemPlatform.ingestEvent({
            eventType: 'login_success',
            source: 'test',
            message: 'User logged in',
            userId: 'user1'
        });
        (0, globals_1.expect)(event.id).toBeDefined();
        (0, globals_1.expect)(event.eventType).toBe('login_success');
    });
    (0, globals_1.it)('should correlate events and trigger alert', async () => {
        // Rule: Brute Force (5 failures in 60s)
        const userId = 'attacker-' + Date.now();
        // Ingest 4 failures
        for (let i = 0; i < 4; i++) {
            await SIEMPlatform_js_1.siemPlatform.ingestEvent({
                eventType: 'login_failed',
                source: 'auth-service',
                message: 'Failed login',
                userId: userId,
                ipAddress: '192.168.1.100'
            });
        }
        // Should not alert yet
        let alerts = SIEMPlatform_js_1.siemPlatform.getAlerts({}).filter(a => a.description.includes(userId));
        (0, globals_1.expect)(alerts.length).toBe(0);
        // 5th failure
        await SIEMPlatform_js_1.siemPlatform.ingestEvent({
            eventType: 'login_failed',
            source: 'auth-service',
            message: 'Failed login',
            userId: userId,
            ipAddress: '192.168.1.100'
        });
        // Should alert now
        alerts = SIEMPlatform_js_1.siemPlatform.getAlerts({}).filter(a => a.title.includes('Brute Force'));
        (0, globals_1.expect)(alerts.length).toBeGreaterThan(0);
        // Verify it's the right alert (check timestamp or IP)
        const recentAlert = alerts.find(a => a.description.includes('192.168.1.100'));
        (0, globals_1.expect)(recentAlert).toBeDefined();
    });
});
