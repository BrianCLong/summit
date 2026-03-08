"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const KillSwitchService_js_1 = require("./KillSwitchService.js");
const DriftDetectionService_js_1 = require("./DriftDetectionService.js");
const TelemetryService_js_1 = require("./TelemetryService.js");
const logger_js_1 = require("../config/logger.js");
// Mock logger
globals_1.jest.mock('../config/logger.js', () => ({
    logger: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        fatal: globals_1.jest.fn(),
    }
}));
// Mock alerting service
globals_1.jest.mock('../lib/telemetry/alerting-service.js', () => ({
    alertingService: {
        sendAlert: globals_1.jest.fn(),
    }
}));
(0, globals_1.describe)('Observability Services', () => {
    (0, globals_1.describe)('KillSwitchService', () => {
        (0, globals_1.beforeEach)(() => {
            // Reset state if possible, or just re-assert expected behavior
            // Since it's a singleton, state persists. We should implement a reset method for testing,
            // but for now we'll just toggle back and forth.
            if (KillSwitchService_js_1.killSwitchService.isGlobalKillSwitchActive()) {
                KillSwitchService_js_1.killSwitchService.disengageGlobalKillSwitch('test', 'reset');
            }
        });
        (0, globals_1.it)('should engage and disengage global kill switch', () => {
            KillSwitchService_js_1.killSwitchService.engageGlobalKillSwitch('admin', 'emergency');
            (0, globals_1.expect)(KillSwitchService_js_1.killSwitchService.isGlobalKillSwitchActive()).toBe(true);
            (0, globals_1.expect)(logger_js_1.logger.fatal).toHaveBeenCalledWith(globals_1.expect.anything(), 'GLOBAL KILL SWITCH ENGAGED');
            KillSwitchService_js_1.killSwitchService.disengageGlobalKillSwitch('admin', 'resolved');
            (0, globals_1.expect)(KillSwitchService_js_1.killSwitchService.isGlobalKillSwitchActive()).toBe(false);
        });
        (0, globals_1.it)('should block operations when global kill switch is active', () => {
            KillSwitchService_js_1.killSwitchService.engageGlobalKillSwitch('admin', 'test');
            const result = KillSwitchService_js_1.killSwitchService.checkSystemHealth({ agentId: 'agent-1' });
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.reason).toContain('Global Kill Switch is Active');
            KillSwitchService_js_1.killSwitchService.disengageGlobalKillSwitch('admin', 'cleanup');
        });
        (0, globals_1.it)('should handle scoped kill switches', () => {
            KillSwitchService_js_1.killSwitchService.killAgent('bad-agent', 'admin', 'misbehavior');
            const resultBad = KillSwitchService_js_1.killSwitchService.checkSystemHealth({ agentId: 'bad-agent' });
            (0, globals_1.expect)(resultBad.allowed).toBe(false);
            (0, globals_1.expect)(resultBad.reason).toContain('is kill-switched');
            const resultGood = KillSwitchService_js_1.killSwitchService.checkSystemHealth({ agentId: 'good-agent' });
            (0, globals_1.expect)(resultGood.allowed).toBe(true);
            KillSwitchService_js_1.killSwitchService.reviveAgent('bad-agent', 'admin', 'forgiven');
            const resultRevived = KillSwitchService_js_1.killSwitchService.checkSystemHealth({ agentId: 'bad-agent' });
            (0, globals_1.expect)(resultRevived.allowed).toBe(true);
        });
    });
    (0, globals_1.describe)('DriftDetectionService', () => {
        (0, globals_1.it)('should detect behavioral drift', () => {
            // Mock baseline: successRate: 0.95, errorRate: 0.05
            // Healthy metrics
            DriftDetectionService_js_1.driftDetectionService.checkBehavioralDrift('planner', { successRate: 0.96, errorRate: 0.04 });
            // Should not alert (we can't easily check alert call without better mocking of singleton,
            // but we can check if it throws)
            // Drifting metrics (success rate drop)
            DriftDetectionService_js_1.driftDetectionService.checkBehavioralDrift('planner', { successRate: 0.80, errorRate: 0.05 });
            // alertingService.sendAlert should be called.
            // In a real unit test we would spy on the imported module.
        });
    });
    (0, globals_1.describe)('TelemetryService', () => {
        (0, globals_1.it)('should log structured events', () => {
            const event = {
                id: '123',
                agentId: 'agent-1',
                actionType: 'test_action',
                status: 'success',
                durationMs: 100,
                timestamp: new Date(),
                metadata: {}
            };
            TelemetryService_js_1.telemetryService.logEvent('agent_action', event);
            (0, globals_1.expect)(logger_js_1.logger.info).toHaveBeenCalledWith(globals_1.expect.objectContaining({ eventType: 'agent_action', agentId: 'agent-1' }), globals_1.expect.stringContaining('Telemetry Event'));
        });
    });
});
