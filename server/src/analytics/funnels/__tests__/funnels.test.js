"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FunnelService_js_1 = require("../FunnelService.js");
const TEST_LOG_DIR = path_1.default.join(__dirname, 'test_logs_funnels_' + Date.now());
(0, globals_1.describe)('FunnelService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        if (fs_1.default.existsSync(TEST_LOG_DIR)) {
            fs_1.default.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
        fs_1.default.mkdirSync(TEST_LOG_DIR, { recursive: true });
        service = new FunnelService_js_1.FunnelService(TEST_LOG_DIR);
    });
    (0, globals_1.afterEach)(() => {
        if (fs_1.default.existsSync(TEST_LOG_DIR)) {
            try {
                fs_1.default.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            }
            catch (e) { }
        }
    });
    (0, globals_1.it)('should compute funnel steps correctly', () => {
        const events = [
            // User 1: Full conversion A -> B -> C
            { eventType: 'page_view', scopeHash: 'u1', ts: '2023-01-01T10:00:00Z', props: { path: '/start' } },
            { eventType: 'click', scopeHash: 'u1', ts: '2023-01-01T10:01:00Z', props: { id: 'btn' } },
            { eventType: 'purchase', scopeHash: 'u1', ts: '2023-01-01T10:02:00Z', props: {} },
            // User 2: Drop off after A
            { eventType: 'page_view', scopeHash: 'u2', ts: '2023-01-01T11:00:00Z', props: { path: '/start' } },
            // User 3: A -> B but no C
            { eventType: 'page_view', scopeHash: 'u3', ts: '2023-01-01T12:00:00Z', props: { path: '/start' } },
            { eventType: 'click', scopeHash: 'u3', ts: '2023-01-01T12:05:00Z', props: { id: 'btn' } },
        ];
        fs_1.default.writeFileSync(path_1.default.join(TEST_LOG_DIR, 'telemetry.jsonl'), events.map(e => JSON.stringify(e)).join('\n'));
        const funnel = {
            id: 'checkout',
            name: 'Checkout Funnel',
            windowSeconds: 3600,
            steps: [
                { name: 'Start', eventType: 'page_view', props: { path: '/start' } },
                { name: 'Click', eventType: 'click', props: { id: 'btn' } },
                { name: 'Buy', eventType: 'purchase' }
            ]
        };
        service.createFunnel(funnel);
        const report = service.generateReport('checkout');
        (0, globals_1.expect)(report.totalStarted).toBe(3); // u1, u2, u3
        (0, globals_1.expect)(report.stepCounts[0]).toBe(3);
        (0, globals_1.expect)(report.stepCounts[1]).toBe(2); // u1, u3
        (0, globals_1.expect)(report.stepCounts[2]).toBe(1); // u1
        (0, globals_1.expect)(report.completed).toBe(1);
        (0, globals_1.expect)(report.dropOffRates[1]).toBeCloseTo(33.33); // 3 -> 2 is 33% drop
        (0, globals_1.expect)(report.dropOffRates[2]).toBeCloseTo(50.0); // 2 -> 1 is 50% drop
    });
});
