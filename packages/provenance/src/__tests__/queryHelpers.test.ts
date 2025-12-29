import {
  fetchByCorrelationId,
  fetchByReceiptId,
  fetchDecisionLineage,
  ProvenanceQueryAdapter,
  ProvenanceRecord,
} from '../queryHelpers.js';

describe('queryHelpers', () => {
  const mockRecords: ProvenanceRecord[] = [
    {
      receiptId: 'r-1',
      correlationId: 'c-1',
      decisionId: 'd-1',
      parentDecisionId: null,
      createdAt: '2024-12-01T12:00:00.000Z',
    },
    {
      receiptId: 'r-2',
      correlationId: 'c-1',
      decisionId: 'd-2',
      parentDecisionId: 'd-1',
      createdAt: '2024-12-01T12:01:00.000Z',
    },
    {
      receiptId: 'r-3',
      correlationId: 'c-2',
      decisionId: 'd-3',
      parentDecisionId: 'd-2',
      createdAt: '2024-12-02T09:00:00.000Z',
    },
  ];

  const createAdapter = (
    findManyImpl: ProvenanceQueryAdapter['findMany'],
    findOneImpl: ProvenanceQueryAdapter['findOne'],
  ): ProvenanceQueryAdapter => ({
    findMany: findManyImpl,
    findOne: findOneImpl,
  });

  it('fetches all records for a correlationId sorted by createdAt', async () => {
    const findMany = jest.fn().mockResolvedValue([mockRecords[1], mockRecords[0]]);
    const adapter = createAdapter(findMany, jest.fn());

    const results = await fetchByCorrelationId(adapter, 'c-1');

    expect(findMany).toHaveBeenCalledWith({ correlationId: 'c-1' });
    expect(results.map((record) => record.receiptId)).toEqual(['r-1', 'r-2']);
  });

  it('fetches a single record by receiptId', async () => {
    const findOne = jest.fn().mockResolvedValue(mockRecords[0]);
    const adapter = createAdapter(jest.fn(), findOne);

    const record = await fetchByReceiptId(adapter, 'r-1');

    expect(findOne).toHaveBeenCalledWith({ receiptId: 'r-1' });
    expect(record?.decisionId).toBe('d-1');
  });

  it('walks the decision lineage defensively', async () => {
    const graph = new Map<string, ProvenanceRecord>([
      ['d-3', mockRecords[2]],
      ['d-2', mockRecords[1]],
      ['d-1', mockRecords[0]],
    ]);

    const findOne = jest.fn(({ decisionId }) =>
      Promise.resolve(graph.get(decisionId as string) ?? null),
    );
    const adapter = createAdapter(jest.fn(), findOne);

    const lineage = await fetchDecisionLineage(adapter, 'd-3', { maxDepth: 5 });

    expect(findOne).toHaveBeenCalledTimes(3);
    expect(lineage.map((node) => node.decisionId)).toEqual(['d-1', 'd-2', 'd-3']);
  });

  it('guards against empty identifiers', async () => {
    const adapter = createAdapter(jest.fn(), jest.fn());

    await expect(fetchByCorrelationId(adapter, '')).rejects.toThrow('correlationId');
    await expect(fetchByReceiptId(adapter, '   ')).rejects.toThrow('receiptId');
    await expect(fetchDecisionLineage(adapter, '')).rejects.toThrow('decisionId');
  });
});
