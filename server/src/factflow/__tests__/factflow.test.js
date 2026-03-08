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
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Mock engine dependencies
globals_1.jest.mock('../../factflow/engine.js', () => ({
    FactFlowEngine: globals_1.jest.fn().mockImplementation(() => ({
        process: globals_1.jest.fn().mockResolvedValue({ report: 'mock report' }),
    })),
}));
globals_1.jest.mock('../../factflow/adapters/transcription.js', () => ({
    MockTranscriptionAdapter: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../factflow/adapters/diarization.js', () => ({
    MockDiarizationAdapter: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../factflow/verification.js', () => ({
    MockVerificationEngine: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../factflow/gate.js', () => ({
    PublishGate: globals_1.jest.fn(),
}));
// Mock logger
globals_1.jest.unstable_mockModule('../../config/logger.js', () => ({
    logger: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
    },
}));
describe('FactFlow Module', () => {
    let app;
    beforeAll(async () => {
        // Re-import to ensure mocks are applied
        const { factFlowRouter } = await Promise.resolve().then(() => __importStar(require('../index.js')));
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/factflow', factFlowRouter);
    });
    it('POST /api/factflow/jobs should start a new job', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/factflow/jobs')
            .send({ audioBase64: 'base64audio' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('job_id');
        expect(res.body.status).toBe('processing');
    });
    it('GET /api/factflow/jobs/:id should return job status', async () => {
        // First create a job
        const createRes = await (0, supertest_1.default)(app)
            .post('/api/factflow/jobs')
            .send({ audioBase64: 'base64audio' });
        const jobId = createRes.body.job_id;
        // Then check status
        const res = await (0, supertest_1.default)(app).get(`/api/factflow/jobs/${jobId}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBeDefined();
    });
});
