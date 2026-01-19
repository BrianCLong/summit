import { describe, it, expect } from 'vitest';
import { transformWal2JsonChange } from '../src/capture/logical.js';

describe('parseWal2Json', () => {
  it('should transform an insert change correctly', () => {
    const change = {
      kind: 'insert',
      schema: 'public',
      table: 'accounts',
      columnnames: ['id', 'name', 'status'],
      columnvalues: [1, 'Alice', 'active'],
      pk: {
        pknames: ['id'],
        pkvalues: [1]
      }
    };
    const lsn = '0/16B1908';

    const event = transformWal2JsonChange(change, lsn);
    expect(event).toEqual({
      table: 'accounts',
      op: 'INSERT',
      pk: { id: 1 },
      before: null,
      after: { id: 1, name: 'Alice', status: 'active' },
      lsn
    });
  });

  it('should transform an update change correctly', () => {
    const change = {
      kind: 'update',
      schema: 'public',
      table: 'accounts',
      columnnames: ['id', 'name', 'status'],
      columnvalues: [1, 'Alice', 'inactive'],
      oldkeys: {
        keynames: ['id', 'name', 'status'],
        keyvalues: [1, 'Alice', 'active']
      },
      pk: {
        pknames: ['id'],
        pkvalues: [1]
      }
    };
    const lsn = '0/16B1909';

    const event = transformWal2JsonChange(change, lsn);
    expect(event).toEqual({
      table: 'accounts',
      op: 'UPDATE',
      pk: { id: 1 },
      before: { id: 1, name: 'Alice', status: 'active' },
      after: { id: 1, name: 'Alice', status: 'inactive' },
      lsn
    });
  });

  it('should transform a delete change correctly', () => {
    const change = {
      kind: 'delete',
      schema: 'public',
      table: 'accounts',
      oldkeys: {
        keynames: ['id'],
        keyvalues: [1]
      },
      pk: {
        pknames: ['id'],
        pkvalues: [1]
      }
    };
    const lsn = '0/16B190A';

    const event = transformWal2JsonChange(change, lsn);
    expect(event).toEqual({
      table: 'accounts',
      op: 'DELETE',
      pk: { id: 1 },
      before: { id: 1 },
      after: null,
      lsn
    });
  });
});
