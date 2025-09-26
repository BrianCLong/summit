import type { Logger } from 'pino';

const graphCsvImportModule = require('../../services/GraphCsvImportService');

const {
  GraphCsvImportService,
  GraphCsvImportError,
  chunkArray,
} = graphCsvImportModule as {
  GraphCsvImportService: new (...args: any[]) => any;
  GraphCsvImportError: typeof Error;
  chunkArray: <T>(items: T[], size: number) => T[][];
};

function createLogger(): Partial<Logger> {
  return {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;
}

describe('GraphCsvImportService', () => {
  it('parses CSV content with headers', () => {
    const service = new GraphCsvImportService({ driver: { session: jest.fn() }, logger: createLogger() });

    const csv = 'id,label,name,active\n1,Person,Alice,true\n2,Person,Bob,false';
    const result = service.parseCsv(csv);

    expect(result.fields).toContain('id');
    expect(result.fields).toContain('label');
    expect(result.rows).toHaveLength(2);
  });

  it('throws when CSV exceeds configured size', () => {
    const service = new GraphCsvImportService({ driver: { session: jest.fn() }, logger: createLogger() });

    expect(() => service.parseCsv('id,label\n1,Person', { maxFileSize: 4 })).toThrow(GraphCsvImportError);
  });

  it('returns schema errors for invalid node payloads', async () => {
    const service = new GraphCsvImportService({ driver: { session: jest.fn() }, logger: createLogger() });

    const result = await service.importGraphCsv({ nodesCsv: 'id,name\n1,Alice' });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.code).toBe('INVALID_NODE_SCHEMA');
    expect(result.nodes.processed).toBe(0);
  });

  it('supports dry runs without hitting the database', async () => {
    const driver = { session: jest.fn() };
    const service = new GraphCsvImportService({ driver, logger: createLogger() });

    const nodesCsv = 'id,label,name\n1,Person,Alice\n2,Person,Bob';
    const relationshipsCsv = 'startId,endId,type\n1,2,KNOWS';

    const result = await service.importGraphCsv({ nodesCsv, relationshipsCsv, dryRun: true });

    expect(driver.session).not.toHaveBeenCalled();
    expect(result.nodes.processed).toBe(2);
    expect(result.nodes.imported).toBe(2);
    expect(result.relationships.imported).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('writes batches to Neo4j when importing data', async () => {
    const run = jest.fn().mockResolvedValue({
      records: [
        {
          get: jest.fn().mockReturnValue(1),
        },
      ],
    });
    const close = jest.fn().mockResolvedValue(undefined);
    const session = { run, close };
    const driver = { session: jest.fn(() => session) };
    const service = new GraphCsvImportService({ driver, logger: createLogger() });

    const nodesCsv = 'id,label,name\n1,Person,Alice\n2,Person,Bob';
    const relationshipsCsv = 'startId,endId,type\n1,2,KNOWS\n2,1,KNOWS';

    const result = await service.importGraphCsv({ nodesCsv, relationshipsCsv, dryRun: false, batchSize: 1 });

    expect(driver.session).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
    const executedQueries = run.mock.calls.map((call) => call[0]);
    expect(executedQueries.some((query: string) => query.includes('MERGE (n:Person'))).toBe(true);
    expect(executedQueries.some((query: string) => query.includes('MERGE (start)-[rel:KNOWS]->(end)'))).toBe(true);
    expect(result.nodes.imported).toBe(2);
    expect(result.relationships.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
  });
});

describe('chunkArray utility', () => {
  it('splits items into evenly sized chunks', () => {
    const chunks = chunkArray([1, 2, 3, 4, 5], 2);
    expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
  });
});

