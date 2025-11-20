import { PostgresBatcher, Neo4jBatcher } from '../src/db/batch.js';
import { getPostgresPool } from '../src/db/postgres.js';
import { neo } from '../src/db/neo4j.js';

// Mock dependencies
jest.mock('../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(),
}));

jest.mock('../src/db/neo4j.js', () => ({
  neo: {
    run: jest.fn(),
  },
}));

describe('PostgresBatcher', () => {
  let poolMock: any;
  let writeMock: jest.Mock;

  beforeEach(() => {
    writeMock = jest.fn();
    poolMock = { write: writeMock };
    (getPostgresPool as jest.Mock).mockReturnValue(poolMock);
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should flush when buffer is full', async () => {
    const batcher = new PostgresBatcher({
      tableName: 'test_table',
      columns: ['col1', 'col2'],
      flushSize: 2,
    });

    await batcher.add({ col1: 1, col2: 'a' });
    expect(writeMock).not.toHaveBeenCalled();

    await batcher.add({ col1: 2, col2: 'b' });
    expect(writeMock).toHaveBeenCalledTimes(1);

    const callArgs = writeMock.mock.calls[0];
    expect(callArgs[0]).toContain('INSERT INTO test_table (col1, col2)');
    expect(callArgs[1]).toEqual([1, 'a', 2, 'b']);
  });

  it('should flush on timeout', async () => {
    const batcher = new PostgresBatcher({
      tableName: 'test_table',
      columns: ['col1'],
      flushSize: 10,
      flushIntervalMs: 1000,
    });

    batcher.add({ col1: 1 });
    expect(writeMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    // Flush is async, so we need to wait for promises
    await Promise.resolve();

    expect(writeMock).toHaveBeenCalledTimes(1);
  });

  it('should transform items correctly', async () => {
    const batcher = new PostgresBatcher({
      tableName: 'test_table',
      columns: ['id', 'val'],
      flushSize: 1,
      transform: (item: any) => [item.id, item.val.toUpperCase()]
    });

    await batcher.add({ id: 1, val: 'hello' });

    expect(writeMock).toHaveBeenCalledWith(
      expect.stringContaining('VALUES ($1, $2)'),
      [1, 'HELLO']
    );
  });
});

describe('Neo4jBatcher', () => {
  let runMock: jest.Mock;

  beforeEach(() => {
    runMock = (neo.run as jest.Mock);
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should flush when buffer is full', async () => {
    const batcher = new Neo4jBatcher({
      cypher: 'UNWIND $batch as row CREATE (n:Node)',
      flushSize: 2,
    });

    await batcher.add({ id: 1 });
    expect(runMock).not.toHaveBeenCalled();

    await batcher.add({ id: 2 });
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenCalledWith(
      'UNWIND $batch as row CREATE (n:Node)',
      { batch: [{ id: 1 }, { id: 2 }] }
    );
  });
});
