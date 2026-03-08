"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
const globals_1 = require("@jest/globals");
const tenant_repository_js_1 = require("../../db/tenant_repository.js");
// Mock getPostgresPool
const mockPool = {
    query: globals_1.jest.fn(),
};
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: () => mockPool,
}));
(0, globals_1.describe)('TenantRepository', () => {
    let repo;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        repo = new tenant_repository_js_1.TenantRepository('test_table');
    });
    test('findById adds tenant_id clause', async () => {
        mockPool.query.mockResolvedValue({ rows: [{ id: '1', tenant_id: 't1' }] });
        await repo.findById('t1', '1');
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('WHERE id = $1 AND tenant_id = $2'), ['1', 't1']);
    });
    test('findAll adds tenant_id clause', async () => {
        mockPool.query.mockResolvedValue({ rows: [] });
        await repo.findAll('t1');
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('WHERE tenant_id = $1'), ['t1']);
    });
    test('create adds tenant_id', async () => {
        mockPool.query.mockResolvedValue({ rows: [{ id: '1', tenant_id: 't1' }] });
        await repo.create('t1', { name: 'test' });
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO test_table (tenant_id, name)'), ['t1', 'test']);
    });
    test('update adds tenant_id clause', async () => {
        mockPool.query.mockResolvedValue({ rows: [{ id: '1', tenant_id: 't1' }] });
        await repo.update('t1', '1', { name: 'updated' });
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE test_table'), ['1', 't1', 'updated']);
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('WHERE id = $1 AND tenant_id = $2'), globals_1.expect.anything());
    });
    test('delete adds tenant_id clause', async () => {
        mockPool.query.mockResolvedValue({ rowCount: 1 });
        await repo.delete('t1', '1');
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('DELETE FROM test_table WHERE id = $1 AND tenant_id = $2'), ['1', 't1']);
    });
});
