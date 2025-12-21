import { ToilService } from '../ToilService';
import { getPostgresPool } from '../../db/postgres';
import { jest } from '@jest/globals';

jest.mock('../../db/postgres');

describe('ToilService', () => {
  const mockPool = {
    write: jest.fn(),
    read: jest.fn(),
  };

  beforeAll(() => {
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log toil', async () => {
    (mockPool.write as jest.Mock).mockResolvedValue({ rows: [{ id: '123' }] });

    const result = await ToilService.getInstance().logToil({
      category: 'interrupt',
      durationMinutes: 10,
      severity: 'low',
      tenantId: 't1',
    });

    expect(mockPool.write).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO toil_entries'),
      expect.arrayContaining(['interrupt', 10, 'low', 't1'])
    );
    expect(result).toEqual({ id: '123' });
  });

  it('should register exception', async () => {
    (mockPool.write as jest.Mock).mockResolvedValue({ rows: [{ id: '456' }] });

    const expiry = new Date();
    const result = await ToilService.getInstance().registerException({
      processName: 'manual',
      owner: 'me',
      justification: 'because',
      expiryDate: expiry,
      tenantId: 't1',
    });

    expect(mockPool.write).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO toil_exceptions'),
      expect.arrayContaining(['manual', 'me', 'because', expiry, 't1'])
    );
    expect(result).toEqual({ id: '456' });
  });

  it('should get stats', async () => {
      (mockPool.read as jest.Mock).mockResolvedValue({ rows: [{ category: 'interrupt', total_minutes: 100 }] });

      const result = await ToilService.getInstance().getStats('t1');

      expect(mockPool.read).toHaveBeenCalledWith(
          expect.stringContaining('SELECT category'),
          ['t1']
      );
      expect(result).toEqual([{ category: 'interrupt', total_minutes: 100 }]);
  });
});
