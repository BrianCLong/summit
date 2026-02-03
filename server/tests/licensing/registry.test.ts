
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { DataLicenseRegistry } from '../../src/licensing/registry';
import { Pool } from 'pg';

// Mock PG
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease
});
const mockPool = {
    connect: mockConnect,
    query: mockQuery
} as unknown as Pool;

describe('DataLicenseRegistry', () => {
    let registry: DataLicenseRegistry;

    beforeEach(() => {
        registry = new DataLicenseRegistry(mockPool);
        mockQuery.mockReset();
        mockConnect.mockClear();
        mockRelease.mockClear();
        // Re-mock connect to return the client object with release
        mockConnect.mockResolvedValue({
            query: mockQuery,
            release: mockRelease
        });
    });

    test('registerSourceLicense should insert license and update source', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // insert license
        mockQuery.mockResolvedValueOnce({ rows: [] }); // update source

        await registry.registerSourceLicense('src-1', {
            id: 'lic-1',
            name: 'Test License',
            complianceLevel: 'allow',
            restrictions: {
                exportAllowed: true,
                commercialUse: false,
                attributionRequired: true
            }
        });

        expect(mockConnect).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledTimes(2);
        // First query (insert license)
        expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO licenses');
        expect(mockQuery.mock.calls[0][1]).toEqual([
            'lic-1', 'Test License', 'allow', expect.any(String)
        ]);
    });

    test('checkCompliance should return allowed if no license found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await registry.checkCompliance('src-1', 'ingest');
        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('No license restriction');
    });

    test('checkCompliance should block if license level is block', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: 'lic-1',
                compliance_level: 'block',
                restrictions: {}
            }]
        });

        const result = await registry.checkCompliance('src-1', 'ingest');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('explicitly blocks');
    });

    test('checkCompliance should block export if restricted', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: 'lic-1',
                compliance_level: 'allow',
                restrictions: { exportAllowed: false }
            }]
        });

        const result = await registry.checkCompliance('src-1', 'export');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Export not allowed');
    });
});
