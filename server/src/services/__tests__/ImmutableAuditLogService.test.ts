import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockedFs = {
  mkdir: jest.fn(),
  appendFile: jest.fn(),
  readdir: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  rm: jest.fn(),
  writeFile: jest.fn(),
};

jest.unstable_mockModule('fs/promises', () => ({
  ...mockedFs,
  default: mockedFs,
}));

describe('ImmutableAuditLogService', () => {
  let service: any;
  let ImmutableAuditLogService: any;

  beforeAll(async () => {
    const module = await import('../ImmutableAuditLogService.js');
    ImmutableAuditLogService = module.ImmutableAuditLogService;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockedFs.mkdir.mockResolvedValue(undefined as any);
    mockedFs.appendFile.mockResolvedValue(undefined as any);
    mockedFs.readdir.mockResolvedValue([] as any);
    mockedFs.access.mockRejectedValue(new Error('ENOENT') as any);
    mockedFs.stat.mockResolvedValue({ size: 0 } as any);
    mockedFs.readFile.mockResolvedValue('' as any);
    mockedFs.rm.mockResolvedValue(undefined as any);
    mockedFs.writeFile.mockResolvedValue(undefined as any);

    service = new ImmutableAuditLogService({
      logPath: './test-audits',
      enabled: true,
      batchSize: 10,
      backpressureThreshold: 100,
    });
  });

  it('queues and processes audit events', async () => {
    await service.logAuditEvent({
      eventType: 'TEST',
      userId: 'user1',
      tenantId: 'tenant1',
      action: 'test',
      resource: 'resource1',
      result: 'success',
      ipAddress: '127.0.0.1',
      currentHash: '',
      signature: '',
    });

    await (service as any).processQueuedEvents();

    expect(mockedFs.mkdir).toHaveBeenCalled();
    expect(mockedFs.appendFile).toHaveBeenCalled();

    const appendCall = mockedFs.appendFile.mock.calls[0];
    const filePath = appendCall[0] as string;
    const content = appendCall[1] as string;

    expect(filePath).toContain('test-audits');
    expect(content).toContain('"eventType":"TEST"');
    expect(content).toContain('"userId":"user1"');
  });

  it('batches multiple events into a single write', async () => {
    const eventCount = 5;
    (service as any).isProcessing = true;

    for (let i = 0; i < eventCount; i++) {
      await service.logAuditEvent({
        eventType: 'BATCH_TEST',
        userId: `user${i}`,
        tenantId: 'tenant1',
        action: 'test',
        resource: `resource${i}`,
        result: 'success',
        ipAddress: '127.0.0.1',
        currentHash: '',
        signature: '',
      });
    }

    (service as any).isProcessing = false;
    await (service as any).processQueuedEvents();

    const calls = mockedFs.appendFile.mock.calls;
    expect(calls.length).toBe(1);

    const allContent = calls[0][1] as string;
    for (let i = 0; i < eventCount; i++) {
      expect(allContent).toContain(`"userId":"user${i}"`);
    }
  });
});
