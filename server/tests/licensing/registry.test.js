"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const registry_1 = require("../../src/licensing/registry");
// Mock PG
const mockQuery = globals_1.jest.fn();
const mockRelease = globals_1.jest.fn();
const mockConnect = globals_1.jest.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease
});
const mockPool = {
    connect: mockConnect,
    query: mockQuery
};
(0, globals_1.describe)('DataLicenseRegistry', () => {
    let registry;
    (0, globals_1.beforeEach)(() => {
        registry = new registry_1.DataLicenseRegistry(mockPool);
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
        (0, globals_1.expect)(mockConnect).toHaveBeenCalled();
        (0, globals_1.expect)(mockQuery).toHaveBeenCalledTimes(2);
        // First query (insert license)
        (0, globals_1.expect)(mockQuery.mock.calls[0][0]).toContain('INSERT INTO licenses');
        (0, globals_1.expect)(mockQuery.mock.calls[0][1]).toEqual([
            'lic-1', 'Test License', 'allow', globals_1.expect.any(String)
        ]);
    });
    test('checkCompliance should return allowed if no license found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const result = await registry.checkCompliance('src-1', 'ingest');
        (0, globals_1.expect)(result.allowed).toBe(true);
        (0, globals_1.expect)(result.reason).toContain('No license restriction');
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
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.reason).toContain('explicitly blocks');
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
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.reason).toContain('Export not allowed');
    });
});
