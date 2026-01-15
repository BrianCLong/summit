import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { DataResidencyService } from '../../../src/data-residency/residency-service';

// Mock dependencies
const mockQuery = jest.fn();

// Mock getPostgresPool specifically
jest.mock('../../../src/db/postgres', () => ({
  getPostgresPool: jest.fn(() => ({ query: mockQuery }))
}));

jest.mock('../../../src/middleware/observability/otel-tracing', () => ({
  otelService: {
    createSpan: jest.fn().mockReturnValue({ end: jest.fn() }),
    addSpanAttributes: jest.fn()
  }
}));

describe('DC1.1 - Data Protection - Data Encryption', () => {
  let service: DataResidencyService;

  beforeEach(() => {
    mockQuery.mockReset();
    service = new DataResidencyService();
  });

  test('should encrypt sensitive data and log audit event', async () => {
    const tenantId = 'tenant-123';
    const sensitiveData = 'super-secret-data';
    const classification = {
      level: 'confidential',
      categories: ['pii'],
      residencyRequirements: [],
      encryptionRequired: true,
      auditRequired: true
    };

    // Mock DB responses
    // 1. getResidencyConfig
    mockQuery.mockResolvedValueOnce({
      rows: [{
        region: 'us-east-1',
        encryption_required: true,
        allowed_transfers: '[]',
        data_classifications: '[]'
      }]
    });
    // 2. getKMSConfig (return empty to force local fallback)
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 3. audit log insert
    mockQuery.mockResolvedValueOnce({});

    const result = await service.encryptData(tenantId, sensitiveData, classification as any);

    expect(result.encryptedData).toBeDefined();
    expect(result.encryptedData).not.toBe(sensitiveData);
    expect(result.encryptionMetadata.algorithm).toContain('aes-256-gcm');

    // Verify audit log
    // Expect 3 calls: getResidencyConfig, getKMSConfig, INSERT
    expect(mockQuery).toHaveBeenCalledTimes(3);
    const calls = mockQuery.mock.calls;
    const insertCall = calls.find((call: any) => call[0].includes('INSERT INTO encryption_audit'));
    expect(insertCall).toBeDefined();
  });

  test('should decrypt data successfully', async () => {
    const tenantId = 'tenant-123';
    const originalData = 'secret-message';

    // Mock kmsConfig to assume we have a provider
    const mockKmsProvider = {
      provider: 'mock-kms',
      keyId: 'key-123',
      region: 'us-east-1'
    };

    // Mock getKMSConfig return
    mockQuery.mockResolvedValueOnce({
      rows: [{
        provider: 'mock-kms',
        key_id: 'key-123',
        region: 'us-east-1',
        endpoint: 'mock-endpoint'
      }]
    });
    // Mock audit log
    mockQuery.mockResolvedValueOnce({});

    // Inject mock provider into service
    // We access the private map 'kmsProviders'
    const mockDecrypt = jest.fn().mockResolvedValue(originalData);
    (service as any).kmsProviders.set('mock-kms', {
      decrypt: mockDecrypt
    });

    const decrypted = await service.decryptData(
      tenantId,
      'encrypted-blob',
      { some: 'metadata' }
    );

    expect(decrypted).toBe(originalData);
    expect(mockDecrypt).toHaveBeenCalled();
  });
});
