import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReportGrading, SourceReliability, SourceStatus } from '../../types/humint.js';

const mockQuery = jest.fn();
const mockRun = jest.fn();
const mockSessionClose = jest.fn();
const mockSession = jest.fn();

const getPostgresPoolMock = jest.fn();
const getNeo4jDriverMock = jest.fn();

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: getPostgresPoolMock,
  getNeo4jDriver: getNeo4jDriverMock,
}));

describe('HumintService', () => {
  let HumintService: any;
  let service: any;
  let mockPool: any;
  let mockDriver: any;
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeAll(async () => {
    ({ HumintService } = await import('../HumintService.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: mockQuery,
    };

    mockDriver = {
      session: mockSession,
      close: jest.fn(),
      verifyConnectivity: jest.fn(),
      supportsMultiDb: jest.fn(),
      configuration: jest.fn(),
    };

    mockSession.mockReturnValue({
      run: mockRun,
      close: mockSessionClose,
      lastBookmark: jest.fn(),
      beginTransaction: jest.fn(),
      executeRead: jest.fn(),
      executeWrite: jest.fn(),
    });

    getPostgresPoolMock.mockReturnValue(mockPool);
    getNeo4jDriverMock.mockReturnValue(mockDriver);

    (HumintService as any).instance = undefined;
    service = HumintService.getInstance();
  });

  describe('createSource', () => {
    it('should create a source in Postgres and Neo4j', async () => {
      const input = {
        cryptonym: 'DEEP_THROAT',
        reliability: SourceReliability.A,
        accessLevel: 'High level clearance',
        status: SourceStatus.RECRUITED,
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

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO humint_sources'),
        expect.arrayContaining([input.cryptonym, input.reliability, tenantId]),
      );

      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (s:HumintSource {id: $id})'),
        expect.objectContaining({
          id: 'source-uuid',
          cryptonym: input.cryptonym,
          tenantId,
        }),
      );

      expect(result.id).toBe('source-uuid');
      expect(result.cryptonym).toBe(input.cryptonym);
    });

    it('should rollback Postgres if Neo4j fails', async () => {
      const input = {
        cryptonym: 'FAILED_SPY',
        reliability: SourceReliability.F,
        accessLevel: 'None',
        status: SourceStatus.RECRUITED,
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

      await expect(service.createSource(tenantId, userId, input)).rejects.toThrow(
        'Neo4j connection failed',
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM humint_sources WHERE id = $1'),
        ['failed-uuid'],
      );
    });
  });

  describe('createReport', () => {
    it('should create an intelligence report', async () => {
      const input = {
        sourceId: 'source-uuid',
        content: 'The eagle has landed.',
        grading: ReportGrading.ONE,
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

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO humint_reports'),
        expect.arrayContaining([input.sourceId, input.content, 'DRAFT']),
      );

      expect(result.id).toBe('report-uuid');
      expect(result.content).toBe(input.content);
    });
  });

  describe('runCIScreening', () => {
    it('should flag burned sources', async () => {
      const sourceData = {
        id: 'burned-source',
        cryptonym: 'BURNED_SPY',
        reliability: SourceReliability.E,
        access_level: 'None',
        status: SourceStatus.BURNED,
        tenant_id: tenantId,
      };

      mockQuery.mockResolvedValueOnce({ rows: [sourceData] });

      const result = await service.runCIScreening(tenantId, 'burned-source');

      expect(result.passed).toBe(false);
      expect(result.flags).toContain('Source is marked as BURNED');
    });

    it('should pass reliable active sources', async () => {
      const sourceData = {
        id: 'good-source',
        cryptonym: 'GOOD_SPY',
        reliability: SourceReliability.A,
        access_level: 'High',
        status: SourceStatus.RECRUITED,
        tenant_id: tenantId,
      };

      mockQuery.mockResolvedValueOnce({ rows: [sourceData] });

      const result = await service.runCIScreening(tenantId, 'good-source');

      expect(result.passed).toBe(true);
      expect(result.flags).toHaveLength(0);
    });
  });
});
