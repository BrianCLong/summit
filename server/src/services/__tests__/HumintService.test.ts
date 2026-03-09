import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { HumintService } from '../HumintService.js';
import { SourceReliability, SourceStatus, ReportGrading } from '../../types/humint.js';

// Mock dependencies
const mockQuery = jest.fn();
const mockRun = jest.fn();
const mockSessionClose = jest.fn();
const mockSession = jest.fn(() => ({
  run: mockRun,
  close: mockSessionClose,
  lastBookmark: jest.fn(),
  beginTransaction: jest.fn(),
  executeRead: jest.fn(),
  executeWrite: jest.fn(),
}));

const mockDriver = {
  session: mockSession,
  close: jest.fn(),
  verifyConnectivity: jest.fn(),
  supportsMultiDb: jest.fn(),
  configuration: jest.fn(),
};

jest.mock('../../config/database.js', () => ({
  getPostgresPool: () => ({
    query: mockQuery,
  }),
  getNeo4jDriver: () => mockDriver,
}));

describe('HumintService', () => {
  let service: HumintService;
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(() => {
    // Reset singleton instance for testing if possible, or just reset mocks
    jest.clearAllMocks();
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
        rows: [{
          id: 'source-uuid',
          ...input,
          recruited_at: new Date(),
          handler_id: userId,
          tenant_id: tenantId,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      };

      // Type cast mock to any to avoid TS errors
      (mockQuery as jest.Mock<any>).mockResolvedValueOnce(mockDbResult);
      (mockRun as jest.Mock<any>).mockResolvedValueOnce({}); // Neo4j result
      // Need to ensure close is resolved properly.
      (mockSessionClose as jest.Mock<any>).mockResolvedValue(undefined);

      // Ensure mockSession returns our mocked object with run()
      (mockSession as jest.Mock<any>).mockReturnValue({
        run: mockRun,
        close: mockSessionClose,
      });

      const result = await service.createSource(tenantId, userId, input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO humint_sources'),
        expect.arrayContaining([input.cryptonym, input.reliability, tenantId])
      );

      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (s:HumintSource {id: $id})'),
        expect.objectContaining({
          id: 'source-uuid',
          cryptonym: input.cryptonym,
          tenantId
        })
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
          rows: [{
            id: 'failed-uuid',
            ...input,
            recruited_at: new Date(),
            handler_id: userId,
            tenant_id: tenantId,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        };

        (mockQuery as jest.Mock<any>).mockResolvedValueOnce(mockDbResult); // Insert success
        (mockRun as jest.Mock<any>).mockRejectedValueOnce(new Error('Neo4j connection failed')); // Neo4j fail
        (mockSessionClose as jest.Mock<any>).mockResolvedValue(undefined);

        // Ensure mockSession returns our mocked object with run()
        (mockSession as jest.Mock<any>).mockReturnValue({
          run: mockRun,
          close: mockSessionClose,
        });

        await expect(service.createSource(tenantId, userId, input)).rejects.toThrow('Neo4j connection failed');

        // Verify rollback delete was called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM humint_sources WHERE id = $1'),
          ['failed-uuid']
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
        rows: [{
          id: 'report-uuid',
          source_id: input.sourceId,
          content: input.content,
          grading: input.grading,
          status: 'DRAFT',
          dissemination_list: input.disseminationList,
          created_by: userId,
          tenant_id: tenantId,
          created_at: new Date(),
        }],
      };

      (mockQuery as jest.Mock<any>).mockResolvedValueOnce(mockDbResult);

      const result = await service.createReport(tenantId, userId, input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO humint_reports'),
        expect.arrayContaining([input.sourceId, input.content, 'DRAFT'])
      );

      expect(result.id).toBe('report-uuid');
      expect(result.content).toBe(input.content);
    });
  });

  describe('runCIScreening', () => {
    it('should flag burned sources', async () => {
      // Mock getSource call
      const sourceData = {
        id: 'burned-source',
        cryptonym: 'BURNED_SPY',
        reliability: SourceReliability.E,
        access_level: 'None',
        status: SourceStatus.BURNED,
        tenant_id: tenantId,
      };

      (mockQuery as jest.Mock<any>).mockResolvedValueOnce({ rows: [sourceData] });

      const result = await service.runCIScreening(tenantId, 'burned-source');

      expect(result.passed).toBe(false);
      expect(result.flags).toContain('Source is marked as BURNED');
    });

    it('should pass reliable active sources', async () => {
        // Mock getSource call
        const sourceData = {
          id: 'good-source',
          cryptonym: 'GOOD_SPY',
          reliability: SourceReliability.A,
          access_level: 'High',
          status: SourceStatus.RECRUITED,
          tenant_id: tenantId,
        };

        (mockQuery as jest.Mock<any>).mockResolvedValueOnce({ rows: [sourceData] });

        const result = await service.runCIScreening(tenantId, 'good-source');

        expect(result.passed).toBe(true);
        expect(result.flags).toHaveLength(0);
      });
  });
});
