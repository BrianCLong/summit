import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type StoredRow = {
  id: string;
  tenant_id: string;
  kind: string;
  props: Record<string, unknown>;
  valid_from: Date;
  valid_to: Date;
  transaction_from: Date;
  transaction_to: Date;
};

const FAR_FUTURE = new Date('9999-12-31T23:59:59.000Z');
const rows: StoredRow[] = [];

const mockQuery = jest.fn(async (sql: string, params: unknown[] = []) => {
  const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();

  if (
    normalized.startsWith('BEGIN') ||
    normalized.startsWith('COMMIT') ||
    normalized.startsWith('ROLLBACK')
  ) {
    return { rows: [], rowCount: 0 };
  }

  if (normalized.startsWith('UPDATE BITEMPORAL_ENTITIES')) {
    const [id, tenantId, expectedTxTo, validFrom, nextTxTo] = params as string[];
    let count = 0;
    for (const row of rows) {
      if (
        row.id === id &&
        row.tenant_id === tenantId &&
        row.transaction_to.toISOString() === new Date(expectedTxTo).toISOString() &&
        row.valid_from.toISOString() === new Date(validFrom).toISOString()
      ) {
        row.transaction_to = new Date(nextTxTo);
        count += 1;
      }
    }
    return { rows: [], rowCount: count };
  }

  if (normalized.startsWith('INSERT INTO BITEMPORAL_ENTITIES')) {
    const [id, tenantId, kind, props, validFrom, validTo, transactionFrom] =
      params as string[];
    rows.push({
      id,
      tenant_id: tenantId,
      kind,
      props: JSON.parse(props),
      valid_from: new Date(validFrom),
      valid_to: new Date(validTo),
      transaction_from: new Date(transactionFrom),
      transaction_to: new Date(FAR_FUTURE),
    });
    return { rows: [], rowCount: 1 };
  }

  if (normalized.startsWith('SELECT * FROM BITEMPORAL_ENTITIES')) {
    const [id, tenantId, asOfValid, asOfTx] = params as string[];
    const validAt = new Date(asOfValid).getTime();
    const txAt = new Date(asOfTx).getTime();

    const match = rows
      .filter((row) => {
        return (
          row.id === id &&
          row.tenant_id === tenantId &&
          row.valid_from.getTime() <= validAt &&
          row.valid_to.getTime() > validAt &&
          row.transaction_from.getTime() <= txAt &&
          row.transaction_to.getTime() > txAt
        );
      })
      .sort(
        (a, b) =>
          b.transaction_from.getTime() - a.transaction_from.getTime(),
      )[0];

    return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
  }

  return { rows: [], rowCount: 0 };
});

const mockClient = {
  query: mockQuery,
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn(async () => mockClient),
  query: mockQuery,
};

jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => mockPool),
}));

const { bitemporalService } = await import('../BitemporalService.js');

describe('Bitemporal Service (Task #109)', () => {
  const tenantId = 'test-tenant';
  const entityId = 'target-entity-123';

  beforeEach(() => {
    rows.length = 0;
    mockQuery.mockClear();
    mockPool.connect.mockClear();
    mockClient.release.mockClear();
  });

  it('should record a fact and allow point-in-time retrieval', async () => {
    const validFrom = new Date('2026-01-01T00:00:00Z');

    await bitemporalService.recordFact({
      id: entityId,
      tenantId,
      kind: 'Person',
      props: { name: 'John Doe', status: 'Active' },
      validFrom,
      createdBy: 'test-user',
    });

    const current = await bitemporalService.queryAsOf(entityId, tenantId);
    expect(current).toBeDefined();
    expect(current?.props.name).toBe('John Doe');

    const pastValid = await bitemporalService.queryAsOf(
      entityId,
      tenantId,
      new Date('2025-01-01T00:00:00Z'),
    );
    expect(pastValid).toBeNull();
  });

  it('should support system correction (transaction time travel)', async () => {
    const validFrom = new Date('2026-01-01T00:00:00Z');
    await bitemporalService.recordFact({
      id: entityId,
      tenantId,
      kind: 'Person',
      props: { name: 'John Doe', status: 'Active' },
      validFrom,
      transactionFrom: new Date('2026-01-01T01:00:00Z'),
      createdBy: 'test-user',
    });

    const beforeCorrection = new Date('2026-01-01T01:30:00Z');
    await bitemporalService.recordFact({
      id: entityId,
      tenantId,
      kind: 'Person',
      props: { name: 'Jane Doe', status: 'Active' },
      validFrom,
      transactionFrom: new Date('2026-01-01T02:00:00Z'),
      createdBy: 'corrector',
    });

    const current = await bitemporalService.queryAsOf(
      entityId,
      tenantId,
      new Date('2026-01-01T03:00:00Z'),
      new Date('2026-01-01T03:00:00Z'),
    );
    expect(current?.props.name).toBe('Jane Doe');

    const whatWeKnewThen = await bitemporalService.queryAsOf(
      entityId,
      tenantId,
      new Date('2026-01-01T03:00:00Z'),
      beforeCorrection,
    );
    expect(whatWeKnewThen?.props.name).toBe('John Doe');
  });
});
