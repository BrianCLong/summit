"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ReleaseCriteriaService_js_1 = require("../../src/cases/ReleaseCriteriaService.js");
const CaseRepo_js_1 = require("../../src/repos/CaseRepo.js");
const pg_1 = require("pg");
// Mock dependencies
globals_1.jest.mock('pg');
globals_1.jest.mock('../../src/repos/CaseRepo.js');
globals_1.jest.mock('../../src/config/logger.js', () => ({
    child: () => ({
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
    }),
}));
(0, globals_1.describe)('ReleaseCriteriaService', () => {
    let service;
    let mockPgPool;
    let mockCaseRepo;
    (0, globals_1.beforeEach)(() => {
        mockPgPool = new pg_1.Pool();
        mockCaseRepo = {
            findById: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
        };
        CaseRepo_js_1.CaseRepo.mockImplementation(() => mockCaseRepo);
        service = new ReleaseCriteriaService_js_1.ReleaseCriteriaService(mockPgPool);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('configure', () => {
        (0, globals_1.it)('should update case metadata with config', async () => {
            const caseId = 'case-123';
            const tenantId = 'tenant-1';
            const userId = 'user-1';
            const config = {
                citationCoveragePercent: 80,
                hardBlock: true
            };
            mockCaseRepo.findById.mockResolvedValue({
                id: caseId,
                metadata: { existing: 'data' }
            });
            await service.configure(caseId, tenantId, userId, config);
            (0, globals_1.expect)(mockCaseRepo.findById).toHaveBeenCalledWith(caseId, tenantId);
            (0, globals_1.expect)(mockCaseRepo.update).toHaveBeenCalledWith({
                id: caseId,
                metadata: {
                    existing: 'data',
                    releaseCriteria: config
                }
            }, userId);
        });
        (0, globals_1.it)('should throw error if case not found', async () => {
            mockCaseRepo.findById.mockResolvedValue(null);
            await (0, globals_1.expect)(service.configure('bad-id', 't1', 'u1', {})).rejects.toThrow('Case not found');
        });
    });
    (0, globals_1.describe)('evaluate', () => {
        (0, globals_1.it)('should fail if citation coverage is low', async () => {
            const caseId = 'case-123';
            const tenantId = 'tenant-1';
            mockCaseRepo.findById.mockResolvedValue({
                id: caseId,
                metadata: {
                    citationCoverage: 50,
                    releaseCriteria: {
                        citationCoveragePercent: 80
                    }
                }
            });
            const result = await service.evaluate(caseId, tenantId);
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.reasons).toHaveLength(1);
            (0, globals_1.expect)(result.reasons[0].code).toBe('CITATION_COVERAGE_LOW');
        });
        (0, globals_1.it)('should pass if all criteria met', async () => {
            const caseId = 'case-123';
            const tenantId = 'tenant-1';
            mockCaseRepo.findById.mockResolvedValue({
                id: caseId,
                metadata: {
                    citationCoverage: 90,
                    releaseCriteria: {
                        citationCoveragePercent: 80
                    }
                }
            });
            const result = await service.evaluate(caseId, tenantId);
            (0, globals_1.expect)(result.passed).toBe(true);
            (0, globals_1.expect)(result.reasons).toHaveLength(0);
        });
        (0, globals_1.it)('should fail if hard block is enabled and criteria not met', async () => {
            const caseId = 'case-123';
            const tenantId = 'tenant-1';
            mockCaseRepo.findById.mockResolvedValue({
                id: caseId,
                metadata: {
                    citationCoverage: 50,
                    releaseCriteria: {
                        citationCoveragePercent: 80,
                        hardBlock: true
                    }
                }
            });
            const result = await service.evaluate(caseId, tenantId);
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.config.hardBlock).toBe(true);
        });
    });
});
