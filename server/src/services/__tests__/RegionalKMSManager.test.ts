import { jest, beforeAll } from '@jest/globals';

const queryMock = jest.fn();

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: () => ({
    query: queryMock,
  }),
}));

describe('RegionalKMSManager', () => {
    let RegionalKMSManager: any;
    let kmsManager: any;

    beforeAll(async () => {
        ({ RegionalKMSManager } = await import('../RegionalKMSManager.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (RegionalKMSManager as any).instance = undefined;
        kmsManager = RegionalKMSManager.getInstance();
    });

    it('should return KMS config if found for tenant and region', async () => {
        queryMock.mockResolvedValue({
            rows: [{
                id: 'kms-1',
                tenant_id: 'tenant-1',
                region: 'us-east-1',
                provider: 'aws',
                key_id: 'arn:aws:kms:us-east-1:123:key/abc',
                status: 'active'
            }]
        });

        const config = await kmsManager.getKMSConfig('tenant-1', 'us-east-1');

        expect(config).toBeDefined();
        expect(config?.kmsKeyId).toBe('arn:aws:kms:us-east-1:123:key/abc');
        expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining('SELECT * FROM kms_configs'),
            ['tenant-1', 'us-east-1']
        );
    });

    it('should return null if no active config is found', async () => {
        queryMock.mockResolvedValue({ rows: [] });

        const config = await kmsManager.getKMSConfig('tenant-1', 'eu-central-1');
        expect(config).toBeNull();
    });
});
