import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

type StoredFact = {
  id: string;
  tenant_id: string;
  kind: string;
  props: Record<string, unknown>;
  valid_from: string;
  valid_to: string;
  transaction_from: string;
  transaction_to: string;
};

const FAR_FUTURE = '9999-12-31 23:59:59+00';
const store: StoredFact[] = [];
const getPostgresPoolMock = jest.fn();

function toMs(value: string): number {
  if (value === FAR_FUTURE) return Number.MAX_SAFE_INTEGER;
  return new Date(value).getTime();
}

const poolMock = {
  async connect() {
    return {
      async query(sql: string, params: any[] = []) {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [], rowCount: 0 };
        }

        if (sql.includes('UPDATE bitemporal_entities')) {
          const [id, tenantId, transactionTo, validFrom, transactionFrom] = params;
          let updated = 0;
          for (const fact of store) {
            if (
              fact.id === id &&
              fact.tenant_id === tenantId &&
              fact.transaction_to === transactionTo &&
              fact.valid_from === validFrom
            ) {
              fact.transaction_to = transactionFrom;
              updated += 1;
            }
          }
          return { rows: [], rowCount: updated };
        }

        if (sql.includes('INSERT INTO bitemporal_entities')) {
          const [id, tenantId, kind, props, validFrom, validTo, transactionFrom] = params;
          store.push({
            id,
            tenant_id: tenantId,
            kind,
            props: JSON.parse(props),
            valid_from: validFrom,
            valid_to: validTo,
            transaction_from: transactionFrom,
            transaction_to: FAR_FUTURE,
          });
          return { rows: [], rowCount: 1 };
        }

        return { rows: [], rowCount: 0 };
      },
      release() {},
    };
  },
  async query(_sql: string, params: any[] = []) {
    const [id, tenantId, asOfValid, asOfTransaction] = params;
    const validMs = toMs(asOfValid);
    const transactionMs = toMs(asOfTransaction);

    const match = store
      .filter((fact) => {
        return (
          fact.id === id &&
          fact.tenant_id === tenantId &&
          toMs(fact.valid_from) <= validMs &&
          toMs(fact.valid_to) > validMs &&
          toMs(fact.transaction_from) <= transactionMs &&
          toMs(fact.transaction_to) > transactionMs
        );
      })
      .sort((a, b) => toMs(b.transaction_from) - toMs(a.transaction_from))[0];

    if (!match) return { rows: [], rowCount: 0 };

    return {
      rows: [
        {
          ...match,
          valid_from: new Date(match.valid_from),
          valid_to:
            match.valid_to === FAR_FUTURE
              ? new Date('9999-12-31T23:59:59.000Z')
              : new Date(match.valid_to),
          transaction_from: new Date(match.transaction_from),
          transaction_to:
            match.transaction_to === FAR_FUTURE
              ? new Date('9999-12-31T23:59:59.000Z')
              : new Date(match.transaction_to),
        },
      ],
      rowCount: 1,
    };
  },
};

jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: getPostgresPoolMock,
}));

describe('Bitemporal Service (Task #109)', () => {
  let bitemporalService: any;
  const tenantId = 'test-tenant';
  const entityId = 'target-entity-123';

  beforeAll(async () => {
    getPostgresPoolMock.mockReturnValue(poolMock);
    ({ bitemporalService } = await import('../BitemporalService.js'));
  });

  beforeEach(() => {
    store.length = 0;
    getPostgresPoolMock.mockReturnValue(poolMock);
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
    expect(current).not.toBeNull();
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
      createdBy: 'seed-user',
    });

    const transactionBeforeCorrection = new Date();
    await new Promise((resolve) => setTimeout(resolve, 5));

    await bitemporalService.recordFact({
      id: entityId,
      tenantId,
      kind: 'Person',
      props: { name: 'Jane Doe', status: 'Active' },
      validFrom,
      createdBy: 'corrector',
    });

    const current = await bitemporalService.queryAsOf(entityId, tenantId);
    expect(current?.props.name).toBe('Jane Doe');

    const whatWeKnewThen = await bitemporalService.queryAsOf(
      entityId,
      tenantId,
      new Date(),
      transactionBeforeCorrection,
    );
    expect(whatWeKnewThen?.props.name).toBe('John Doe');
  });
});
