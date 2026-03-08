"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const trial_manager_1 = require("../src/trial-manager");
const common_types_1 = require("@ga-graphai/common-types");
(0, vitest_1.describe)('TrialManager', () => {
    let events;
    let manager;
    (0, vitest_1.beforeEach)(() => {
        events = new common_types_1.StructuredEventEmitter();
        vitest_1.vi.spyOn(events, 'emitEvent');
        manager = new trial_manager_1.TrialManager(events);
    });
    (0, vitest_1.it)('should register a new trial', () => {
        const info = manager.registerTrial('tenant-1', 'org-1');
        (0, vitest_1.expect)(info.id).toBe('tenant-1');
        (0, vitest_1.expect)(info.orgId).toBe('org-1');
        (0, vitest_1.expect)(info.status).toBe('active');
        (0, vitest_1.expect)(events.emitEvent).toHaveBeenCalledWith('summit.trial.registered', vitest_1.expect.any(Object));
    });
    (0, vitest_1.it)('should record scans and emit upsell signals', () => {
        manager.registerTrial('tenant-1', 'org-1');
        // Record 4 scans
        for (let i = 0; i < 4; i++) {
            manager.recordScan('tenant-1');
        }
        (0, vitest_1.expect)(events.emitEvent).not.toHaveBeenCalledWith('summit.trial.upsell_signal', vitest_1.expect.any(Object));
        // 5th scan should trigger upsell
        manager.recordScan('tenant-1');
        (0, vitest_1.expect)(events.emitEvent).toHaveBeenCalledWith('summit.trial.upsell_signal', vitest_1.expect.objectContaining({
            reason: 'high_usage'
        }));
    });
    (0, vitest_1.it)('should auto-expire trials', () => {
        const info = manager.registerTrial('tenant-1', 'org-1');
        // Mock date to 8 days in future
        const future = new Date();
        future.setDate(future.getDate() + 8);
        vitest_1.vi.useFakeTimers();
        vitest_1.vi.setSystemTime(future);
        const expired = manager.autoExpire();
        (0, vitest_1.expect)(expired).toContain('tenant-1');
        (0, vitest_1.expect)(events.emitEvent).toHaveBeenCalledWith('summit.trial.expired', vitest_1.expect.any(Object));
        vitest_1.vi.useRealTimers();
    });
});
