import * as fs from 'fs/promises';
import * as path from 'path';
import { ControlledWriteService } from '../service';
import { WriteAction } from '../types';
import { FilePersistenceStore } from '../persistence/file-store';
import { FileSystemExecutor } from '../executor/fs-executor';

// Mock Ledger
jest.mock('../../../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue({ id: 'mock-entry-id' }),
  },
}));

describe('ControlledWriteService - Full Integration (Real FS)', () => {
  const TEST_DIR = path.resolve('server/temp/test-integration');
  const JAIL_DIR = path.join(TEST_DIR, 'jail');
  const DATA_DIR = path.join(TEST_DIR, 'data');

  let service: ControlledWriteService;

  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(JAIL_DIR, { recursive: true });
    await fs.mkdir(DATA_DIR, { recursive: true });

    const persistence = new FilePersistenceStore(DATA_DIR);
    const executor = new FileSystemExecutor(JAIL_DIR);
    service = new ControlledWriteService(persistence, executor);
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  const action: WriteAction = {
    id: 'int-1',
    type: 'DRAFT',
    payload: { target: 'config.json', content: '{"ver":1}' },
    status: 'PENDING_APPROVAL', // Initial status before service handles it
    requester: 'user',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('should flow from request -> approve -> execute -> rollback', async () => {
    // 1. Request
    const approval = await service.requestApproval(action);
    expect(approval.status).toBe('PENDING');

    // Verify persistence
    const savedApproval = await new FilePersistenceStore(DATA_DIR).getApproval(action.id);
    expect(savedApproval?.status).toBe('PENDING');

    // 2. Approve
    await service.approveAction(action.id, 'HUMAN_ADMIN'); // Default approver

    // 3. Execute
    await service.executeAction(action.id);

    // Verify execution
    const content = await fs.readFile(path.join(JAIL_DIR, 'config.json'), 'utf8');
    expect(content).toBe('{"ver":1}');

    // Verify status
    const executedAction = await service.getAction(action.id);
    expect(executedAction?.status).toBe('COMPLETED');

    // 4. Rollback
    await service.rollbackAction(action.id);

    // Verify rollback (file deleted since it was new)
    await expect(fs.access(path.join(JAIL_DIR, 'config.json'))).rejects.toThrow();

    const rolledBackAction = await service.getAction(action.id);
    expect(rolledBackAction?.status).toBe('ROLLED_BACK');
  });

  it('should enforce locking (simulate race)', async () => {
     // This is hard to test deterministically with real FS locking without multiple processes,
     // but we can check if acquiring lock works.
     const persistence = new FilePersistenceStore(DATA_DIR);
     await persistence.acquireLock('lock-test');

     // Second attempt should fail
     const success = await persistence.acquireLock('lock-test');
     expect(success).toBe(false);

     await persistence.releaseLock('lock-test');

     // Third attempt should succeed
     const retry = await persistence.acquireLock('lock-test');
     expect(retry).toBe(true);
     await persistence.releaseLock('lock-test');
  });
});
