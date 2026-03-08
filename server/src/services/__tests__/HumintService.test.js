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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const humint_js_1 = require("../../types/humint.js");
const mockQuery = globals_1.jest.fn();
const mockRun = globals_1.jest.fn();
const mockSessionClose = globals_1.jest.fn();
const mockSession = globals_1.jest.fn();
const getPostgresPoolMock = globals_1.jest.fn();
const getNeo4jDriverMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: getPostgresPoolMock,
    getNeo4jDriver: getNeo4jDriverMock,
}));
(0, globals_1.describe)('HumintService', () => {
    let HumintService;
    let service;
    let mockPool;
    let mockDriver;
    const tenantId = 'tenant-123';
    const userId = 'user-456';
    (0, globals_1.beforeAll)(async () => {
        ({ HumintService } = await Promise.resolve().then(() => __importStar(require('../HumintService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockPool = {
            query: mockQuery,
        };
        mockDriver = {
            session: mockSession,
            close: globals_1.jest.fn(),
            verifyConnectivity: globals_1.jest.fn(),
            supportsMultiDb: globals_1.jest.fn(),
            configuration: globals_1.jest.fn(),
        };
        mockSession.mockReturnValue({
            run: mockRun,
            close: mockSessionClose,
            lastBookmark: globals_1.jest.fn(),
            beginTransaction: globals_1.jest.fn(),
            executeRead: globals_1.jest.fn(),
            executeWrite: globals_1.jest.fn(),
        });
        getPostgresPoolMock.mockReturnValue(mockPool);
        getNeo4jDriverMock.mockReturnValue(mockDriver);
        HumintService.instance = undefined;
        service = HumintService.getInstance();
    });
    (0, globals_1.describe)('createSource', () => {
        (0, globals_1.it)('should create a source in Postgres and Neo4j', async () => {
            const input = {
                cryptonym: 'DEEP_THROAT',
                reliability: humint_js_1.SourceReliability.A,
                accessLevel: 'High level clearance',
                status: humint_js_1.SourceStatus.RECRUITED,
            };
            const mockDbResult = {
                rows: [
                    {
                        id: 'source-uuid',
                        ...input,
                        recruited_at: new Date(),
                        handler_id: userId,
                        tenant_id: tenantId,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            };
            mockQuery.mockResolvedValueOnce(mockDbResult);
            mockRun.mockResolvedValueOnce({});
            mockSessionClose.mockResolvedValue(undefined);
            const result = await service.createSource(tenantId, userId, input);
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO humint_sources'), globals_1.expect.arrayContaining([input.cryptonym, input.reliability, tenantId]));
            (0, globals_1.expect)(mockRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MERGE (s:HumintSource {id: $id})'), globals_1.expect.objectContaining({
                id: 'source-uuid',
                cryptonym: input.cryptonym,
                tenantId,
            }));
            (0, globals_1.expect)(result.id).toBe('source-uuid');
            (0, globals_1.expect)(result.cryptonym).toBe(input.cryptonym);
        });
        (0, globals_1.it)('should rollback Postgres if Neo4j fails', async () => {
            const input = {
                cryptonym: 'FAILED_SPY',
                reliability: humint_js_1.SourceReliability.F,
                accessLevel: 'None',
                status: humint_js_1.SourceStatus.RECRUITED,
            };
            const mockDbResult = {
                rows: [
                    {
                        id: 'failed-uuid',
                        ...input,
                        recruited_at: new Date(),
                        handler_id: userId,
                        tenant_id: tenantId,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            };
            mockQuery.mockResolvedValueOnce(mockDbResult);
            mockRun.mockRejectedValueOnce(new Error('Neo4j connection failed'));
            mockSessionClose.mockResolvedValue(undefined);
            await (0, globals_1.expect)(service.createSource(tenantId, userId, input)).rejects.toThrow('Neo4j connection failed');
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('DELETE FROM humint_sources WHERE id = $1'), ['failed-uuid']);
        });
    });
    (0, globals_1.describe)('createReport', () => {
        (0, globals_1.it)('should create an intelligence report', async () => {
            const input = {
                sourceId: 'source-uuid',
                content: 'The eagle has landed.',
                grading: humint_js_1.ReportGrading.ONE,
                disseminationList: ['general@hq.mil'],
            };
            const mockDbResult = {
                rows: [
                    {
                        id: 'report-uuid',
                        source_id: input.sourceId,
                        content: input.content,
                        grading: input.grading,
                        status: 'DRAFT',
                        dissemination_list: input.disseminationList,
                        created_by: userId,
                        tenant_id: tenantId,
                        created_at: new Date(),
                    },
                ],
            };
            mockQuery.mockResolvedValueOnce(mockDbResult);
            const result = await service.createReport(tenantId, userId, input);
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO humint_reports'), globals_1.expect.arrayContaining([input.sourceId, input.content, 'DRAFT']));
            (0, globals_1.expect)(result.id).toBe('report-uuid');
            (0, globals_1.expect)(result.content).toBe(input.content);
        });
    });
    (0, globals_1.describe)('runCIScreening', () => {
        (0, globals_1.it)('should flag burned sources', async () => {
            const sourceData = {
                id: 'burned-source',
                cryptonym: 'BURNED_SPY',
                reliability: humint_js_1.SourceReliability.E,
                access_level: 'None',
                status: humint_js_1.SourceStatus.BURNED,
                tenant_id: tenantId,
            };
            mockQuery.mockResolvedValueOnce({ rows: [sourceData] });
            const result = await service.runCIScreening(tenantId, 'burned-source');
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.flags).toContain('Source is marked as BURNED');
        });
        (0, globals_1.it)('should pass reliable active sources', async () => {
            const sourceData = {
                id: 'good-source',
                cryptonym: 'GOOD_SPY',
                reliability: humint_js_1.SourceReliability.A,
                access_level: 'High',
                status: humint_js_1.SourceStatus.RECRUITED,
                tenant_id: tenantId,
            };
            mockQuery.mockResolvedValueOnce({ rows: [sourceData] });
            const result = await service.runCIScreening(tenantId, 'good-source');
            (0, globals_1.expect)(result.passed).toBe(true);
            (0, globals_1.expect)(result.flags).toHaveLength(0);
        });
    });
});
