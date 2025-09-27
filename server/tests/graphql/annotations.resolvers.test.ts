import { jest } from '@jest/globals';

type QueryResult<T> = { rows: T[] };

type AnnotationRow = {
  id: string;
  content: string;
  confidence?: string;
  tags?: string[] | null;
  enclave: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  target_type?: string;
  target_id?: string;
};

const mockUuid = jest.fn();
const mockPgQuery = jest.fn<Promise<QueryResult<any>>, any>();
const mockNeoRun = jest.fn();
const mockSessionClose = jest.fn();
const mockEvaluateOPA = jest.fn();

const mockSession = {
  run: mockNeoRun,
  close: mockSessionClose,
};

const mockGetPostgresPool = jest.fn(() => ({ query: mockPgQuery }));
const mockGetNeo4jDriver = jest.fn(() => ({ session: () => mockSession }));

jest.unstable_mockModule('uuid', () => ({ v4: mockUuid }));
jest.unstable_mockModule('../../src/config/database', () => ({
  getNeo4jDriver: mockGetNeo4jDriver,
  getPostgresPool: mockGetPostgresPool,
}));
jest.unstable_mockModule('../../src/services/AccessControl', () => ({
  evaluateOPA: mockEvaluateOPA,
}));

const { default: annotationsResolvers } = await import('../../src/graphql/resolvers.annotations.js');

const contextLogger = { error: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionClose.mockResolvedValue(undefined);
  mockNeoRun.mockResolvedValue({ records: [{}] });
  mockUuid.mockReturnValue('annotation-1');
});

describe('Entity annotations resolver', () => {
  test('filters annotations using OPA policy', async () => {
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const deniedAt = new Date('2024-01-02T00:00:00Z');
    mockPgQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'allowed',
          content: 'Visible note',
          confidence: 'HIGH',
          tags: ['tag1'],
          enclave: 'US_ONLY',
          created_at: createdAt,
          updated_at: createdAt,
          created_by: 'user-2',
        },
        {
          id: 'denied',
          content: 'Hidden note',
          confidence: 'LOW',
          tags: null,
          enclave: 'FIVE_EYES',
          created_at: deniedAt,
          updated_at: deniedAt,
          created_by: 'user-3',
        },
      ] satisfies AnnotationRow[],
    });
    mockEvaluateOPA.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await annotationsResolvers.Entity.annotations(
      { id: 'entity-1' },
      undefined,
      { user: { id: 'user-1', role: 'ANALYST' }, logger: contextLogger },
    );

    expect(mockGetPostgresPool).toHaveBeenCalledTimes(1);
    expect(mockPgQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM graph_annotations'),
      ['ENTITY', 'entity-1'],
    );
    expect(result).toEqual([
      {
        id: 'allowed',
        content: 'Visible note',
        confidence: 'HIGH',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'user-2',
        enclave: 'US_ONLY',
        tags: ['tag1'],
      },
    ]);
    expect(mockNeoRun).not.toHaveBeenCalled();
  });
});

describe('Mutation resolvers', () => {
  const userContext = { user: { id: 'user-1', role: 'ANALYST' }, logger: contextLogger } as const;

  test('createEntityAnnotation stores data in Postgres and Neo4j', async () => {
    const timestamp = new Date('2024-01-03T12:00:00Z');
    mockEvaluateOPA.mockResolvedValueOnce(true);
    mockPgQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'annotation-1',
            content: 'Entity note',
            confidence: 'HIGH',
            tags: ['mission'],
            enclave: 'US_ONLY',
            created_at: timestamp,
            updated_at: timestamp,
            created_by: 'user-1',
          } satisfies AnnotationRow,
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await annotationsResolvers.Mutation.createEntityAnnotation(
      null,
      {
        entityId: 'entity-99',
        input: { content: 'Entity note', confidence: 'HIGH', enclave: 'US_ONLY', tags: ['mission'] },
      },
      userContext,
    );

    expect(mockPgQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO graph_annotations'),
      [
        'annotation-1',
        'ENTITY',
        'entity-99',
        'Entity note',
        'HIGH',
        ['mission'],
        'US_ONLY',
        'user-1',
        expect.any(String),
      ],
    );
    expect(mockNeoRun).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (a:Annotation'),
      expect.objectContaining({
        targetId: 'entity-99',
        annotationId: 'annotation-1',
        tags: ['mission'],
      }),
    );
    expect(result).toEqual({
      id: 'annotation-1',
      content: 'Entity note',
      confidence: 'HIGH',
      createdAt: '2024-01-03T12:00:00.000Z',
      updatedAt: '2024-01-03T12:00:00.000Z',
      createdBy: 'user-1',
      enclave: 'US_ONLY',
      tags: ['mission'],
    });
  });

  test('updateAnnotation syncs changes and audits the update', async () => {
    const createdAt = new Date('2024-01-04T10:00:00Z');
    const updatedAt = new Date('2024-01-04T11:00:00Z');
    mockEvaluateOPA.mockResolvedValueOnce(true);
    mockPgQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'annotation-2',
            target_type: 'EDGE',
            target_id: '12',
            content: 'Old note',
            confidence: 'LOW',
            tags: ['legacy'],
            enclave: 'NATO',
            created_at: createdAt,
            updated_at: createdAt,
            created_by: 'user-2',
          } satisfies AnnotationRow,
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'annotation-2',
            target_type: 'EDGE',
            target_id: '12',
            content: 'Updated note',
            confidence: 'MEDIUM',
            tags: ['refined'],
            enclave: 'NATO',
            created_at: createdAt,
            updated_at: updatedAt,
            created_by: 'user-2',
          } satisfies AnnotationRow,
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await annotationsResolvers.Mutation.updateAnnotation(
      null,
      {
        id: 'annotation-2',
        input: { content: 'Updated note', confidence: 'MEDIUM', tags: ['refined'] },
      },
      userContext,
    );

    expect(mockPgQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE graph_annotations'),
      [
        'Updated note',
        'MEDIUM',
        ['refined'],
        'user-1',
        'annotation-2',
      ],
    );
    expect(mockNeoRun).toHaveBeenCalledWith(
      expect.stringContaining('MATCH ()-[r]->()'),
      expect.objectContaining({
        targetId: '12',
        annotationId: 'annotation-2',
        content: 'Updated note',
      }),
    );
    expect(result).toEqual({
      id: 'annotation-2',
      content: 'Updated note',
      confidence: 'MEDIUM',
      createdAt: '2024-01-04T10:00:00.000Z',
      updatedAt: '2024-01-04T11:00:00.000Z',
      createdBy: 'user-2',
      enclave: 'NATO',
      tags: ['refined'],
    });
  });

  test('deleteAnnotation removes annotation and logs audit event', async () => {
    mockEvaluateOPA.mockResolvedValueOnce(true);
    mockPgQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'annotation-3',
            target_type: 'ENTITY',
            target_id: 'entity-7',
            enclave: 'UNCLASSIFIED',
            created_by: 'user-3',
            content: 'Obsolete',
            confidence: 'UNKNOWN',
            tags: [],
            created_at: new Date('2024-01-05T09:00:00Z'),
            updated_at: new Date('2024-01-05T09:00:00Z'),
          } satisfies AnnotationRow,
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'annotation-3' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await annotationsResolvers.Mutation.deleteAnnotation(
      null,
      { id: 'annotation-3' },
      userContext,
    );

    expect(mockPgQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM graph_annotations'),
      ['annotation-3'],
    );
    expect(mockNeoRun).toHaveBeenCalledWith(
      expect.stringContaining('DETACH DELETE a'),
      { id: 'annotation-3' },
    );
    expect(result).toBe(true);
  });
});
