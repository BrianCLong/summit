"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const self_healing_1 = require("../../../lib/deployment/self-healing");
(0, globals_1.describe)('SelfHealing', () => {
    const config = {
        serviceName: 'critical-worker',
        pid: 1234,
        memoryLeakThreshold: 800, // 800MB
        unresponsiveTimeout: 30, // 30 seconds
        autoScalingThreshold: 90,
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        globals_1.jest.useFakeTimers();
        globals_1.jest.spyOn(self_healing_1.mockOrchestrator, 'restartService').mockResolvedValue();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('should trigger a restart if memory usage exceeds the threshold', async () => {
        globals_1.jest
            .spyOn(self_healing_1.mockProcessMonitor, 'getMemoryUsage')
            .mockResolvedValue(950); // Exceeds 800MB
        globals_1.jest
            .spyOn(self_healing_1.mockProcessMonitor, 'isResponsive')
            .mockResolvedValue(true);
        const selfHealing = new self_healing_1.SelfHealing(config);
        await selfHealing.monitor();
        (0, globals_1.expect)(self_healing_1.mockOrchestrator.restartService).toHaveBeenCalledWith(config.serviceName);
    });
    (0, globals_1.it)('should trigger a restart if the process is unresponsive for the timeout period', async () => {
        globals_1.jest.spyOn(self_healing_1.mockProcessMonitor, 'getMemoryUsage').mockResolvedValue(500);
        globals_1.jest
            .spyOn(self_healing_1.mockProcessMonitor, 'isResponsive')
            .mockResolvedValue(false); // Consistently unresponsive
        const selfHealing = new self_healing_1.SelfHealing(config);
        // First check, streak becomes 1
        await selfHealing.monitor();
        (0, globals_1.expect)(self_healing_1.mockOrchestrator.restartService).not.toHaveBeenCalled();
        // Second check, streak becomes 2
        await selfHealing.monitor();
        (0, globals_1.expect)(self_healing_1.mockOrchestrator.restartService).not.toHaveBeenCalled();
        // Third check, streak is now 3 * 15s interval > 30s timeout
        await selfHealing.monitor();
        (0, globals_1.expect)(self_healing_1.mockOrchestrator.restartService).toHaveBeenCalledWith(config.serviceName);
    });
    (0, globals_1.it)('should not take action if the service is healthy', async () => {
        globals_1.jest.spyOn(self_healing_1.mockProcessMonitor, 'getMemoryUsage').mockResolvedValue(500);
        globals_1.jest
            .spyOn(self_healing_1.mockProcessMonitor, 'isResponsive')
            .mockResolvedValue(true);
        const selfHealing = new self_healing_1.SelfHealing(config);
        await selfHealing.monitor();
        (0, globals_1.expect)(self_healing_1.mockOrchestrator.restartService).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should reset the unresponsive streak if the service becomes responsive again', async () => {
        globals_1.jest.spyOn(self_healing_1.mockProcessMonitor, 'getMemoryUsage').mockResolvedValue(500);
        globals_1.jest
            .spyOn(self_healing_1.mockProcessMonitor, 'isResponsive')
            .mockResolvedValueOnce(false) // Unresponsive once
            .mockResolvedValueOnce(true); // Then responsive
        const selfHealing = new self_healing_1.SelfHealing(config);
        await selfHealing.monitor(); // Unresponsive, streak = 1
        (0, globals_1.expect)(self_healing_1.mockOrchestrator.restartService).not.toHaveBeenCalled();
        await selfHealing.monitor(); // Responsive, streak = 0
        (0, globals_1.expect)(self_healing_1.mockOrchestrator.restartService).not.toHaveBeenCalled();
    });
});
