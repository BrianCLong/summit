
import { jest } from '@jest/globals';

const mockSend = jest.fn();

// Use unstable_mockModule for ESM support
await jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  __esModule: true,
  S3Client: jest.fn(),
  ListObjectsV2Command: jest.fn(),
}));

// Import module under test dynamically after mocking
const { BackupMonitoringService } = await import('../BackupMonitoringService.js');
const { S3Client } = await import('@aws-sdk/client-s3');

describe('BackupMonitoringService', () => {
  let service: BackupMonitoringService;

  beforeEach(() => {
    process.env.S3_BACKUP_BUCKET = 'test-bucket';
    process.env.S3_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

    mockSend.mockReset();

    // Force implementation on the imported mock
    (S3Client as unknown as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    // We instantiate a new service each time
    service = new BackupMonitoringService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.S3_BACKUP_BUCKET;
  });

  it('should return unhealthy if no backups found', async () => {
    mockSend.mockResolvedValue({ Contents: [] });

    const status = await service.getLastBackupStatus();

    expect(status.healthy).toBe(false);
    expect(status.message).toBe('No backups found');
    expect(status.lastBackupAt).toBeNull();
  });

  it('should return healthy if recent backup exists', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    mockSend.mockResolvedValue({
      Contents: [
        { Key: 'backups/old.sql', LastModified: new Date(now.getTime() - 48 * 60 * 60 * 1000), Size: 100 },
        { Key: 'backups/recent.sql', LastModified: oneHourAgo, Size: 200 },
      ],
    });

    const status = await service.getLastBackupStatus();

    expect(status.healthy).toBe(true);
    expect(status.filename).toBe('backups/recent.sql');
    expect(status.sizeBytes).toBe(200);
    expect(status.message).toBe('Backup system healthy');
  });

  it('should return unhealthy if backup is too old', async () => {
    const now = new Date();
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);

    mockSend.mockResolvedValue({
      Contents: [
        { Key: 'backups/old.sql', LastModified: thirtyHoursAgo, Size: 100 },
      ],
    });

    const status = await service.getLastBackupStatus();

    expect(status.healthy).toBe(false);
    expect(status.message).toContain('Last backup was');
  });

  it('should handle S3 errors gracefully', async () => {
    mockSend.mockRejectedValue(new Error('S3 Error'));

    const status = await service.getLastBackupStatus();

    expect(status.healthy).toBe(false);
    expect(status.message).toContain('Error checking backups: S3 Error');
  });
});
