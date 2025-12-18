import { TenantRepository } from '../../db/tenant_repository.js';

// Mock getPostgresPool
const mockPool = {
  query: jest.fn(),
};

jest.mock('../../config/database.js', () => ({
  getPostgresPool: () => mockPool,
}));

describe('TenantRepository', () => {
  let repo: TenantRepository<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TenantRepository('test_table');
  });

  test('findById adds tenant_id clause', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: '1', tenant_id: 't1' }] });

    await repo.findById('t1', '1');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
      ['1', 't1']
    );
  });

  test('findAll adds tenant_id clause', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await repo.findAll('t1');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE tenant_id = $1'),
      ['t1']
    );
  });

  test('create adds tenant_id', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '1', tenant_id: 't1' }] });

      await repo.create('t1', { name: 'test' });

      expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO test_table (tenant_id, name)'),
          ['t1', 'test']
      );
  });

  test('update adds tenant_id clause', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '1', tenant_id: 't1' }] });

      await repo.update('t1', '1', { name: 'updated' });

      expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE test_table'),
          ['1', 't1', 'updated']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
          expect.anything()
      );
  });

  test('delete adds tenant_id clause', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await repo.delete('t1', '1');

      expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM test_table WHERE id = $1 AND tenant_id = $2'),
          ['1', 't1']
      );
  });
});
