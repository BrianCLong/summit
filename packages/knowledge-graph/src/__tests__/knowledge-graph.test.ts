/**
 * Knowledge Graph Tests
 */

import { VersionManager } from '../versioning/VersionManager.js';
import { GraphIndexer } from '../indexing/GraphIndexer.js';

describe('VersionManager', () => {
  let versionManager: VersionManager;

  beforeEach(() => {
    versionManager = new VersionManager();
  });

  test('should create initial version', () => {
    expect(versionManager.getCurrentVersion()).toBe(1);
  });

  test('should record changes', () => {
    versionManager.recordChange({
      type: 'node_added',
      target: 'node:1',
      after: { id: 'node:1', type: 'Person' },
      timestamp: new Date()
    });

    const stats = versionManager.getStatistics();
    expect(stats.versionCount).toBe(1);
  });

  test('should create new version', () => {
    const version = versionManager.createVersion('Test version', 'test-user');
    expect(version).toBe(2);
    expect(versionManager.getCurrentVersion()).toBe(2);
  });

  test('should get version by number', () => {
    const version = versionManager.getVersion(1);
    expect(version).toBeDefined();
    expect(version?.version).toBe(1);
  });

  test('should get all versions', () => {
    versionManager.createVersion('Version 2');
    versionManager.createVersion('Version 3');

    const versions = versionManager.getAllVersions();
    expect(versions.length).toBe(3);
  });
});

describe('GraphIndexer', () => {
  let indexer: GraphIndexer;

  beforeEach(() => {
    indexer = new GraphIndexer();
  });

  test('should create B-tree index', async () => {
    const indexName = await indexer.createBTreeIndex('Person', ['name']);
    expect(indexName).toBe('idx_Person_name');
    expect(indexer.hasIndex(indexName)).toBe(true);
  });

  test('should create full-text index', async () => {
    const indexName = await indexer.createFullTextIndex('search', ['Person'], ['name', 'bio']);
    expect(indexName).toBe('fts_search');
    expect(indexer.hasIndex(indexName)).toBe(true);
  });

  test('should create composite index', async () => {
    const indexName = await indexer.createCompositeIndex('Person', ['firstName', 'lastName']);
    expect(indexName).toBe('composite_Person_firstName_lastName');
  });

  test('should get indexes for label', async () => {
    await indexer.createBTreeIndex('Person', ['name']);
    await indexer.createBTreeIndex('Person', ['email']);
    await indexer.createBTreeIndex('Organization', ['name']);

    const personIndexes = indexer.getIndexesForLabel('Person');
    expect(personIndexes.length).toBe(2);
  });

  test('should drop index', async () => {
    const indexName = await indexer.createBTreeIndex('Person', ['name']);
    expect(indexer.hasIndex(indexName)).toBe(true);

    await indexer.dropIndex(indexName);
    expect(indexer.hasIndex(indexName)).toBe(false);
  });

  test('should generate Cypher for index', async () => {
    await indexer.createBTreeIndex('Person', ['name']);
    const index = indexer.getIndex('idx_Person_name');

    const cypher = indexer.generateIndexCypher(index!);
    expect(cypher).toContain('CREATE INDEX');
    expect(cypher).toContain('Person');
    expect(cypher).toContain('name');
  });
});
