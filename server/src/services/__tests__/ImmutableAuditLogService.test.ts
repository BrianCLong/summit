import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mocks before imports
const mockFs = {
  mkdir: jest.fn(),
  appendFile: jest.fn(),
  readdir: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  rm: jest.fn(),
  writeFile: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

const mockMiddleware = {
  trackError: jest.fn(),
};

jest.unstable_mockModule('fs/promises', () => ({
  default: mockFs,
  ...mockFs,
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: mockLogger,
  logger: mockLogger,
  ...mockLogger,
}));

jest.unstable_mockModule('../../monitoring/middleware.js', () => ({
  trackError: mockMiddleware.trackError,
}));

// Import module under test after mocks
const { ImmutableAuditLogService } = await import('../ImmutableAuditLogService.js');

describe('ImmutableAuditLogService', () => {
  let service: any; // Type as any or define interface if needed
  const mockLogPath = './test-audits';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.access.mockRejectedValue(new Error('ENOENT'));

    service = new ImmutableAuditLogService({
      logPath: mockLogPath,
      enabled: true,
      batchSize: 10,
      backpressureThreshold: 100
    });
  });

  it('should queue and process audit events', async () => {
    await service.logAuditEvent({
      eventType: 'TEST',
      userId: 'user1',
      tenantId: 'tenant1',
      action: 'test',
      resource: 'resource1',
      result: 'success',
      ipAddress: '127.0.0.1',
      currentHash: '',
      signature: ''
    });

    await service.flushQueue();

    expect(mockFs.mkdir).toHaveBeenCalled();
    expect(mockFs.appendFile).toHaveBeenCalled();

    const appendCall = mockFs.appendFile.mock.calls[0];
    const filePath = appendCall[0] as string;
    const content = appendCall[1] as string;

    // Check if path contains the directory name (ignoring absolute/relative prefix issues)
    expect(filePath).toContain('test-audits');
    expect(content).toContain('"eventType":"TEST"');
    expect(content).toContain('"userId":"user1"');
  });

  it('should batch multiple events into a single write (optimization check)', async () => {
    const eventCount = 5;

    // Simulate processing is busy to accumulate events in queue
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
        signature: ''
      });
    }

    // Release processing lock
    (service as any).isProcessing = false;

    // Now flush, it should pick up all events in one batch (batchSize=10)
    await service.flushQueue();

    const calls = mockFs.appendFile.mock.calls;

    // Expect exactly ONE write call for the batch
    expect(calls.length).toBe(1);

    const allContent = calls[0][1] as string;
    for (let i = 0; i < eventCount; i++) {
      expect(allContent).toContain(`"userId":"user${i}"`);
    }
  });
});
