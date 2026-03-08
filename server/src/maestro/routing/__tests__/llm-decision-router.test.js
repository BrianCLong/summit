"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const globals_1 = require("@jest/globals");
globals_1.jest.unstable_mockModule('../../../db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
    })),
}));
globals_1.jest.unstable_mockModule('../../../middleware/observability/otel-tracing.js', () => ({
    otelService: {
        createSpan: globals_1.jest.fn(() => ({
            addSpanAttributes: globals_1.jest.fn(),
            end: globals_1.jest.fn(),
        })),
    },
}));
const baseFeatures = {
    complexity: 0.6,
    contextLength: 1200,
    urgency: 0.3,
    costSensitivity: 0.4,
    qualityRequirement: 0.9,
    domain: ['analysis'],
    estimatedTokens: 1000,
};
(0, globals_1.describe)('LLMDecisionRouter audit trails', () => {
    let DecisionRecorder;
    let LLMDecisionRouter;
    let ReplayRunner;
    let LearningToRankRouter;
    let recorder;
    let router;
    let logPath;
    (0, globals_1.beforeAll)(async () => {
        ({ DecisionRecorder } = await Promise.resolve().then(() => __importStar(require('../decision-recorder.js'))));
        ({ LLMDecisionRouter } = await Promise.resolve().then(() => __importStar(require('../llm-decision-router.js'))));
        ({ ReplayRunner } = await Promise.resolve().then(() => __importStar(require('../replay-runner.js'))));
        ({ LearningToRankRouter } = await Promise.resolve().then(() => __importStar(require('../learning-to-rank.js'))));
    });
    (0, globals_1.beforeEach)(async () => {
        const tempDir = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'llm-router-'));
        logPath = node_path_1.default.join(tempDir, 'decisions.jsonl');
        recorder = new DecisionRecorder(logPath);
        router = new LLMDecisionRouter(new LearningToRankRouter(), recorder);
    });
    (0, globals_1.it)('records primary decisions and persists JSONL audit entries', async () => {
        const { record } = await router.route({
            prompt: 'Summarize the intelligence brief',
            context: { requestId: 'req-1' },
            tenantId: 'tenant-a',
            userId: 'user-1',
            policies: ['default-routing'],
            constraints: { allowedProviders: ['openai'] },
            features: baseFeatures,
            redactions: ['email-address'],
        });
        const persisted = await recorder.load(record.decisionId);
        (0, globals_1.expect)(persisted?.outcome.provider).toBe('openai');
        (0, globals_1.expect)(persisted?.outcome.guardrailActions.piiRedactions).toContain('email-address');
        const logContent = await promises_1.default.readFile(logPath, 'utf8');
        (0, globals_1.expect)(logContent).toContain(record.decisionId);
    });
    (0, globals_1.it)('honors preferred provider policy ordering', async () => {
        const { record } = await router.route({
            prompt: 'Draft a policy memo',
            context: {},
            tenantId: 'tenant-b',
            policies: ['prefer-anthropic', 'fallback-openai'],
            constraints: { preferredProviders: ['anthropic', 'openai'] },
            features: baseFeatures,
        });
        (0, globals_1.expect)(record.request.policies).toEqual(['prefer-anthropic', 'fallback-openai']);
        (0, globals_1.expect)(record.outcome.provider).toBe('anthropic');
    });
    (0, globals_1.it)('records fallback attempts when constraints block the top option', async () => {
        const { record } = await router.route({
            prompt: 'Write a situational update',
            context: {},
            tenantId: 'tenant-c',
            constraints: { blockedModels: ['gpt-4o'] },
            features: baseFeatures,
        });
        const blocked = record.outcome.fallbacks.find((fallback) => fallback.model === 'gpt-4o');
        (0, globals_1.expect)(blocked?.reason).toBe('model_blocked_by_policy');
        (0, globals_1.expect)(record.outcome.provider).not.toBe('openai');
    });
    (0, globals_1.it)('replays routing decisions deterministically with the stored prompt', async () => {
        const { record } = await router.route({
            prompt: 'Generate a concise executive summary',
            context: { locale: 'en-US' },
            tenantId: 'tenant-d',
            features: baseFeatures,
            redactions: ['phone-number'],
        });
        const replayRunner = new ReplayRunner(recorder, new LLMDecisionRouter(new LearningToRankRouter(), recorder));
        const replay = await replayRunner.replay(record.decisionId);
        (0, globals_1.expect)(replay.matches).toBe(true);
        (0, globals_1.expect)(replay.renderedOutput).toContain('concise executive summary');
    });
});
