import fs from 'fs';
import os from 'os';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GraphExportServiceModule = require('../src/services/GraphExportService.js');
const { GraphExportService } = GraphExportServiceModule;

describe('GraphExportService', () => {
  let session: any;
  let driver: any;
  let service: any;
  let exportDir: string;

  const nodeRecords = [
    {
      get: (key: string) =>
        key === 'n'
          ? {
              properties: { id: 'n1', label: 'Node One', type: 'PERSON', confidence: 0.91, tenantId: 'tenant-1' },
              identity: { toString: () => 'n1' },
              labels: ['PERSON'],
            }
          : null,
    },
    {
      get: (key: string) =>
        key === 'n'
          ? {
              properties: { id: 'n2', label: 'Node Two', type: 'ORG', confidence: 0.82, tenantId: 'tenant-1' },
              identity: { toString: () => 'n2' },
              labels: ['ORG'],
            }
          : null,
    },
  ];

  const edgeRecord = {
    get: (key: string) => {
      if (key === 'rel') {
        return {
          properties: { id: 'e1', type: 'LINKED_TO', weight: 0.6 },
          identity: { toString: () => 'e1' },
          type: 'LINKED_TO',
        };
      }
      if (key === 'sourceId') return 'n1';
      if (key === 'targetId') return 'n2';
      return null;
    },
  };

  const prepareNeo4jResponses = () => {
    session.run.mockResolvedValueOnce({ records: nodeRecords });
    session.run.mockResolvedValueOnce({ records: [edgeRecord] });
  };

  const streamToString = async (stream: NodeJS.ReadableStream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  };

  beforeEach(() => {
    exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-export-test-'));
    session = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    driver = { session: () => session };
    service = new GraphExportService({ getDriver: () => driver, exportDir, ttlMs: 60 * 60 * 1000 });
  });

  afterEach(() => {
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
    }
  });

  it('exports a filtered graph as GraphML with metadata and registry entry', async () => {
    prepareNeo4jResponses();

    const result = await service.exportSubgraph({
      format: 'GRAPHML',
      tenantId: 'tenant-1',
      investigationId: 'inv-123',
      filters: { nodeTypes: ['PERSON'], maxEdges: 10 },
      requestedBy: 'user-1',
    });

    expect(result.format).toBe('GRAPHML');
    expect(result.downloadUrl).toBe(`/api/graph/exports/${result.exportId}`);
    expect(result.filtersApplied.nodeTypes).toEqual(['PERSON']);
    const exportedPath = path.join(exportDir, result.filename);
    expect(fs.existsSync(exportedPath)).toBe(true);
    const raw = fs.readFileSync(exportedPath, 'utf8');
    expect(raw).toContain('<graphml');
    expect(raw).toContain('Node One');
    expect(raw).toContain('LINKED_TO');

    const streamEntry = service.getExportStream(result.exportId);
    expect(streamEntry).not.toBeNull();
    if (!streamEntry) throw new Error('expected export stream');
    const streamed = await streamToString(streamEntry.stream);
    expect(streamed).toContain('<graphml');
    expect(streamed).toContain('Node Two');
  });

  it('exports a graph as GEXF for visualization tools', async () => {
    prepareNeo4jResponses();

    const result = await service.exportSubgraph({
      format: 'GEXF',
      tenantId: 'tenant-1',
      filters: { relationshipTypes: ['LINKED_TO'], minWeight: 0.5 },
    });

    expect(result.format).toBe('GEXF');
    const exportedPath = path.join(exportDir, result.filename);
    const raw = fs.readFileSync(exportedPath, 'utf8');
    expect(raw).toContain('<gexf');
    expect(raw).toContain('LINKED_TO');
    expect(raw).toContain('Node One');
  });

  it('cleans up expired exports', async () => {
    prepareNeo4jResponses();

    const result = await service.exportSubgraph({ format: 'GRAPHML', tenantId: 'tenant-1' });
    const exportedPath = path.join(exportDir, result.filename);
    expect(fs.existsSync(exportedPath)).toBe(true);

    await service.cleanupExpiredExports(new Date(Date.now() + 2 * 60 * 60 * 1000));

    expect(service.getExportStream(result.exportId)).toBeNull();
    expect(fs.existsSync(exportedPath)).toBe(false);
  });
});
