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
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const globals_1 = require("@jest/globals");
// Mock functions declared before mocks
const mockCreateJob = globals_1.jest.fn();
const mockListJobsForTenant = globals_1.jest.fn();
const mockGetJob = globals_1.jest.fn();
const mockGetDownload = globals_1.jest.fn();
const mockUiEvent = globals_1.jest.fn();
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../disclosure/export-service.js', () => ({
    disclosureExportService: {
        createJob: mockCreateJob,
        listJobsForTenant: mockListJobsForTenant,
        getJob: mockGetJob,
        getDownload: mockGetDownload,
    },
}));
globals_1.jest.unstable_mockModule('../../metrics/disclosureMetrics.js', () => ({
    disclosureMetrics: {
        uiEvent: mockUiEvent,
    },
}));
// Dynamic imports AFTER mocks are set up
const disclosuresRouter = (await Promise.resolve().then(() => __importStar(require('../disclosures.js')))).default;
const { disclosureExportService } = await Promise.resolve().then(() => __importStar(require('../../disclosure/export-service.js')));
const { disclosureMetrics } = await Promise.resolve().then(() => __importStar(require('../../metrics/disclosureMetrics.js')));
const app = (0, express_1.default)();
app.use('/disclosures', disclosuresRouter);
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('Disclosures routes', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('POST /disclosures/export', () => {
        (0, globals_1.it)('creates a disclosure export job when tenant matches header', async () => {
            const job = {
                id: 'job-1',
                tenantId: 'tenant-a',
                status: 'pending',
                createdAt: new Date().toISOString(),
                warnings: [],
                artifactStats: {},
            };
            mockCreateJob.mockResolvedValueOnce(job);
            const response = await (0, supertest_1.default)(app)
                .post('/disclosures/export')
                .set('x-tenant-id', 'tenant-a')
                .send({
                tenantId: 'tenant-a',
                startTime: '2024-01-01T00:00:00Z',
                endTime: '2024-01-02T00:00:00Z',
            });
            (0, globals_1.expect)(response.status).toBe(202);
            (0, globals_1.expect)(response.body.job).toEqual(job);
            (0, globals_1.expect)(disclosureExportService.createJob).toHaveBeenCalledWith({
                tenantId: 'tenant-a',
                startTime: '2024-01-01T00:00:00Z',
                endTime: '2024-01-02T00:00:00Z',
            });
        });
        (0, globals_1.it)('rejects mismatched tenant headers', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/disclosures/export')
                .set('x-tenant-id', 'tenant-a')
                .send({
                tenantId: 'tenant-b',
                startTime: '2024-01-01T00:00:00Z',
                endTime: '2024-01-02T00:00:00Z',
            });
            (0, globals_1.expect)(response.status).toBe(403);
            (0, globals_1.expect)(disclosureExportService.createJob).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('GET /disclosures/export/:jobId', () => {
        (0, globals_1.it)('returns job status when tenant is authorized', async () => {
            const job = {
                id: 'job-1',
                tenantId: 'tenant-a',
                status: 'completed',
                createdAt: new Date().toISOString(),
                warnings: [],
                artifactStats: {},
            };
            mockGetJob.mockReturnValueOnce(job);
            const response = await (0, supertest_1.default)(app)
                .get('/disclosures/export/job-1')
                .set('x-tenant-id', 'tenant-a');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.job).toEqual(job);
        });
        (0, globals_1.it)('returns 404 when job is missing', async () => {
            mockGetJob.mockReturnValueOnce(undefined);
            const response = await (0, supertest_1.default)(app)
                .get('/disclosures/export/missing')
                .set('x-tenant-id', 'tenant-a');
            (0, globals_1.expect)(response.status).toBe(404);
        });
    });
    (0, globals_1.describe)('GET /disclosures/export/:jobId/download', () => {
        (0, globals_1.it)('streams the zip when export completed', async () => {
            const tempDir = fs_1.default.mkdtempSync(path_1.default.join(process.cwd(), 'tmp-test-'));
            const filePath = path_1.default.join(tempDir, 'bundle.zip');
            fs_1.default.writeFileSync(filePath, 'zip-data');
            const job = {
                id: 'job-1',
                tenantId: 'tenant-a',
                status: 'completed',
                createdAt: new Date().toISOString(),
                warnings: [],
                artifactStats: {},
            };
            mockGetDownload.mockReturnValueOnce({
                job,
                filePath,
            });
            const response = await (0, supertest_1.default)(app)
                .get('/disclosures/export/job-1/download')
                .set('x-tenant-id', 'tenant-a');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.headers['content-disposition']).toContain('attachment');
            fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        });
    });
    (0, globals_1.describe)('POST /disclosures/analytics', () => {
        (0, globals_1.it)('records analytics events when payload valid', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/disclosures/analytics')
                .set('x-tenant-id', 'tenant-a')
                .send({ event: 'view', tenantId: 'tenant-a' });
            (0, globals_1.expect)(response.status).toBe(202);
            (0, globals_1.expect)(disclosureMetrics.uiEvent).toHaveBeenCalledWith('view', 'tenant-a');
        });
    });
});
