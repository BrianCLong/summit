import { ControlledWriteService } from '../service';
import { WriteAction } from '../types';
import { PersistenceStore, WriteExecutor, ExecutionPlan } from '../interfaces';

// Mock Ledger
jest.mock('../../../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue({ id: 'mock-entry-id' }),
  },
}));

// Mock Persistence
const mockPersistence: jest.Mocked<PersistenceStore> = {
  saveAction: jest.fn(),
  getAction: jest.fn(),
  updateStatus: jest.fn(),
  saveApproval: jest.fn(),
  getApproval: jest.fn(),
  appendEvent: jest.fn(),
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn(),
};

// Mock Executor
const mockExecutor: jest.Mocked<WriteExecutor> = {
  plan: jest.fn().mockResolvedValue({ files: ['test.txt'], totalBytes: 100, hash: 'abc-123' }),
  execute: jest.fn(),
  rollback: jest.fn(),
};

describe('ControlledWriteService - Approval Gates (With Persistence)', () => {
  let service: ControlledWriteService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ControlledWriteService(mockPersistence, mockExecutor);
  });

  const mockAction: WriteAction = {
    id: 'test-action-1',
    type: 'DRAFT',
    payload: { target: 'test.txt', content: 'hello' },
    status: 'PENDING_APPROVAL',
    requester: 'agent-007',
    approver: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create an approval request for valid action', async () => {
    const request = await service.requestApproval(mockAction);

    expect(mockExecutor.plan).toHaveBeenCalledWith(mockAction);
    expect(mockPersistence.saveAction).toHaveBeenCalled();
    expect(mockPersistence.saveApproval).toHaveBeenCalled();
    expect(request.status).toBe('PENDING');
  });

  it('should allow valid approval', async () => {
    // Setup mocks for "get" calls
    mockPersistence.getAction.mockResolvedValue({ ...mockAction, status: 'PENDING_APPROVAL' });
    mockPersistence.getApproval.mockResolvedValue({
        actionId: mockAction.id,
        approver: 'admin-1',
        scope: 'test',
        expiration: new Date(Date.now() + 10000),
        status: 'PENDING',
        requestedAt: new Date()
    });

    const result = await service.approveAction(mockAction.id, 'admin-1');

    expect(mockPersistence.acquireLock).toHaveBeenCalledWith(mockAction.id);
    expect(mockPersistence.saveApproval).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVED' }));
    expect(mockPersistence.saveAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVED' }));
    expect(result.status).toBe('APPROVED');
  });

  it('should execute action if approved', async () => {
      mockPersistence.getAction.mockResolvedValue({ ...mockAction, status: 'APPROVED' });

      await service.executeAction(mockAction.id);

      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockPersistence.saveAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED' }));
  });
});
