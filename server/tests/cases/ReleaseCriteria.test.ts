
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ReleaseCriteriaService, ReleaseCriteriaConfig } from '../../src/cases/ReleaseCriteriaService.js';
import { CaseRepo } from '../../src/repos/CaseRepo.js';
import { Pool } from 'pg';

// Mock dependencies
jest.mock('pg');
jest.mock('../../src/repos/CaseRepo.js');
jest.mock('../../src/config/logger.js', () => ({
  child: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('ReleaseCriteriaService', () => {
  let service: ReleaseCriteriaService;
  let mockPgPool: any;
  let mockCaseRepo: any;

  beforeEach(() => {
    mockPgPool = new Pool();
    mockCaseRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    (CaseRepo as unknown as jest.Mock).mockImplementation(() => mockCaseRepo);
    service = new ReleaseCriteriaService(mockPgPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('configure', () => {
    it('should update case metadata with config', async () => {
      const caseId = 'case-123';
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const config: ReleaseCriteriaConfig = {
        citationCoveragePercent: 80,
        hardBlock: true
      };

      mockCaseRepo.findById.mockResolvedValue({
        id: caseId,
        metadata: { existing: 'data' }
      });

      await service.configure(caseId, tenantId, userId, config);

      expect(mockCaseRepo.findById).toHaveBeenCalledWith(caseId, tenantId);
      expect(mockCaseRepo.update).toHaveBeenCalledWith({
        id: caseId,
        metadata: {
          existing: 'data',
          releaseCriteria: config
        }
      }, userId);
    });

    it('should throw error if case not found', async () => {
      mockCaseRepo.findById.mockResolvedValue(null);

      await expect(service.configure('bad-id', 't1', 'u1', {})).rejects.toThrow('Case not found');
    });
  });

  describe('evaluate', () => {
    it('should fail if citation coverage is low', async () => {
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

        expect(result.passed).toBe(false);
        expect(result.reasons).toHaveLength(1);
        expect(result.reasons[0].code).toBe('CITATION_COVERAGE_LOW');
      });

    it('should pass if all criteria met', async () => {
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

      expect(result.passed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should fail if hard block is enabled and criteria not met', async () => {
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

        expect(result.passed).toBe(false);
        expect(result.config.hardBlock).toBe(true);
      });
  });
});
