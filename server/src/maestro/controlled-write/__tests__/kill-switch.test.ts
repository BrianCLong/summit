import { ControlledWriteService } from '../service';
import { WriteAction } from '../types';
import { PersistenceStore, WriteExecutor } from '../interfaces';

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
  plan: jest.fn().mockResolvedValue({ files: ['config.json'], totalBytes: 2, hash: 'xyz' }),
  execute: jest.fn(),
  rollback: jest.fn(),
};

describe('ControlledWriteService - Kill Switch and Rollback', () => {
  let service: ControlledWriteService;
  let mockAction: WriteAction;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = new ControlledWriteService(mockPersistence, mockExecutor);
    mockAction = {
      id: 'test-action-kill',
      type: 'PROPOSE',
      payload: { target: 'config.json', content: '{}' },
      status: 'EXECUTING',
      requester: 'agent-007',
      approver: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('should kill an active action', async () => {
    mockPersistence.getAction.mockResolvedValue({ ...mockAction });

    const result = await service.killAction(mockAction.id);

    expect(result.status).toBe('KILLED');
    expect(result.killSwitchActive).toBe(true);
    expect(mockPersistence.saveAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'KILLED' }));
  });

  it('should prevent execution if killed', async () => {
      mockPersistence.getAction.mockResolvedValue({ ...mockAction, status: 'APPROVED', killSwitchActive: true });

      await expect(service.executeAction(mockAction.id)).rejects.toThrow('Kill switch is active');
      expect(mockExecutor.execute).not.toHaveBeenCalled();
  });

  it('should rollback an action', async () => {
    mockPersistence.getAction.mockResolvedValue({ ...mockAction, status: 'COMPLETED' });

    const result = await service.rollbackAction(mockAction.id);

    expect(mockExecutor.rollback).toHaveBeenCalled();
    expect(result.status).toBe('ROLLED_BACK');
    expect(mockPersistence.saveAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'ROLLED_BACK' }));
  });
});
