"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CohortEvaluator_js_1 = require("../CohortEvaluator.js");
const TEST_LOG_DIR = path_1.default.join(__dirname, 'test_logs_cohorts_' + Date.now());
(0, globals_1.describe)('CohortEvaluator', () => {
    let evaluator;
    (0, globals_1.beforeEach)(() => {
        if (fs_1.default.existsSync(TEST_LOG_DIR)) {
            fs_1.default.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
        fs_1.default.mkdirSync(TEST_LOG_DIR, { recursive: true });
        evaluator = new CohortEvaluator_js_1.CohortEvaluator(TEST_LOG_DIR);
    });
    (0, globals_1.afterEach)(() => {
        if (fs_1.default.existsSync(TEST_LOG_DIR)) {
            try {
                fs_1.default.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            }
            catch (e) { }
        }
    });
    (0, globals_1.it)('should identify members matching criteria', () => {
        // Seed some data
        const events = [
            { eventType: 'login', tenantIdHash: 't1', scopeHash: 'u1', ts: new Date().toISOString() },
            { eventType: 'login', tenantIdHash: 't1', scopeHash: 'u1', ts: new Date().toISOString() },
            { eventType: 'login', tenantIdHash: 't2', scopeHash: 'u2', ts: new Date().toISOString() }, // Only 1 login
            { eventType: 'search', tenantIdHash: 't1', scopeHash: 'u1', ts: new Date().toISOString() },
        ];
        fs_1.default.writeFileSync(path_1.default.join(TEST_LOG_DIR, 'telemetry-test.jsonl'), events.map(e => JSON.stringify(e)).join('\n'));
        const cohort = {
            id: 'heavy-users',
            name: 'Heavy Users',
            windowDays: 7,
            criteria: {
                eventType: 'login',
                metric: 'count',
                operator: 'gt',
                value: 1 // Must have > 1 logins
            }
        };
        const result = evaluator.evaluate(cohort);
        (0, globals_1.expect)(result.members.length).toBe(1);
        (0, globals_1.expect)(result.members[0].hashedUserId).toBe('u1');
        (0, globals_1.expect)(result.members[0].metricValue).toBe(2);
    });
});
