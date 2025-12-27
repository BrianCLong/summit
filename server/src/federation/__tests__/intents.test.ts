import { IntentService, IntentOp } from '../intents.js';
import { ShardManager } from '../../graph/partition/ShardManager.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import { jobManager } from '../../jobs/job.manager.js';

// Mock dependencies
jest.mock('../../graph/partition/ShardManager.js');
jest.mock('../../provenance/ledger.js');
jest.mock('../../jobs/job.manager.js');

describe('IntentService', () => {
  let service: IntentService;
  let mockQueue: any;
  let mockDriver: any;
  let mockSession: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup JobManager mock
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };
    (jobManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

    // Setup ShardManager mock
    mockSession = {
        executeWrite: jest.fn().mockImplementation(async (callback) => {
            return await callback({
                run: jest.fn().mockResolvedValue({ records: [] }),
            });
        }),
        close: jest.fn().mockResolvedValue(undefined),
    };
    mockDriver = {
        session: jest.fn().mockReturnValue(mockSession),
    };

    (ShardManager.getInstance as jest.Mock).mockReturnValue({
        getDriver: jest.fn().mockReturnValue(mockDriver),
    });

    // Setup Provenance mock
    (provenanceLedger.appendEntry as jest.Mock).mockResolvedValue(true);

    // Get Service Instance
    service = IntentService.getInstance();
  });

  describe('enqueueIntent', () => {
    it('should add job to the queue', async () => {
      const intentId = await service.enqueueIntent(
        'shard-01',
        'user-123',
        'UPSERT_NODE',
        { key: 'value' }
      );

      expect(jobManager.getQueue).toHaveBeenCalledWith('intents-queue');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-intent',
        expect.objectContaining({
          shardId: 'shard-01',
          actorId: 'user-123',
          op: 'UPSERT_NODE',
        }),
        expect.anything()
      );
      expect(intentId).toBeDefined();
    });

    it('should throw if queue not found', async () => {
      (jobManager.getQueue as jest.Mock).mockReturnValue(undefined);
      await expect(service.enqueueIntent(
        'shard-01',
        'user-123',
        'UPSERT_NODE',
        { key: 'value' }
      )).rejects.toThrow('Queue intents-queue not initialized');
    });
  });

  describe('applyIntent', () => {
    it('should execute UPSERT_NODE successfully', async () => {
      const intent = {
        id: 'intent-1',
        shardId: 'shard-01',
        actorId: 'user-123',
        ts: Date.now(),
        op: 'UPSERT_NODE' as IntentOp,
        payload: {
          labels: ['Person'],
          keyField: 'email',
          keyValue: 'test@example.com',
          properties: { name: 'Test User' }
        },
        policyTags: ['public']
      };

      await service.applyIntent(intent);

      // Verify Shard execution
      expect(mockDriver.session).toHaveBeenCalled();
      expect(mockSession.executeWrite).toHaveBeenCalled();
      
      // Verify Provenance
      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'INTENT_APPLIED',
        resourceId: 'intent-1',
        payload: expect.objectContaining({ status: 'SUCCESS' })
      }));
    });

    it('should throw on policy violation', async () => {
       const intent = {
        id: 'intent-2',
        shardId: 'shard-01',
        actorId: 'bad-actor',
        ts: Date.now(),
        op: 'DELETE' as IntentOp,
        payload: { keyField: 'id', keyValue: '123' },
        policyTags: ['deny-all']
      };

      await expect(service.applyIntent(intent)).rejects.toThrow('POLICY_DENY');
      expect(mockDriver.session).not.toHaveBeenCalled();
    });

    it('should throw if shard not found', async () => {
       (ShardManager.getInstance as jest.Mock).mockReturnValue({
            getDriver: jest.fn().mockReturnValue(undefined),
       });

       const intent = {
        id: 'intent-3',
        shardId: 'missing-shard',
        actorId: 'user',
        ts: Date.now(),
        op: 'DELETE' as IntentOp,
        payload: {},
        policyTags: []
      };

      await expect(service.applyIntent(intent)).rejects.toThrow('Shard missing-shard not found');
    });
  });
});
