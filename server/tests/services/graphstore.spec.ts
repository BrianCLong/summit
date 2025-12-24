import { GenericContainer } from 'testcontainers';
import fs from 'fs/promises';
import path from 'path';
import { createGraphStore } from '../../src/services/GraphStore';
import { getNeo4jDriver, closeNeo4jDriver } from '../../src/db/neo4j';

const maybe = GenericContainer ? describe : describe.skip;

maybe('GraphStore', () => {
  let container: any;
  let store: ReturnType<typeof createGraphStore>;
  let driver: any;

  beforeAll(async () => {
    container = await new GenericContainer('neo4j:5')
      .withEnv('NEO4J_AUTH', 'neo4j/test')
      .withExposedPorts(7687)
      .start();
    const port = container.getMappedPort(7687);
    process.env.NEO4J_URI = `bolt://localhost:${port}`;
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'test';

    store = createGraphStore();
    driver = getNeo4jDriver();

    const session = driver.session();
    const migrationsDir = path.join(__dirname, '../../src/db/neo4j/migrations');
    const files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith('.cypher'))
      .sort();
    for (const file of files) {
      const cypher = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      const statements = cypher
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        await session.run(stmt);
      }
    }
    await session.close();
  }, 60000);

  afterAll(async () => {
    if (driver) await closeNeo4jDriver();
    if (container) await container.stop();
  });

  it('upserts and queries entities', async () => {
    await store.upsertEntity({
      id: 'e1',
      type: 'Person',
      value: 'Alice',
      label: 'Alice',
    });
    await store.upsertEntity({
      id: 'e2',
      type: 'Person',
      value: 'Bob',
      label: 'Bob',
    });
    const search = await store.getEntities({ q: 'Alice' });
    expect(search).toEqual([
      { id: 'e1', type: 'Person', value: 'Alice', label: 'Alice' },
    ]);
    const all = await store.getEntities({ type: 'Person' });
    expect(all).toHaveLength(2);
  });

  it('manages relationships with temporal properties', async () => {
    await store.upsertRelationship({
      id: 'r1',
      fromId: 'e1',
      toId: 'e2',
      type: 'KNOWS',
      since: '2020',
      until: '2025',
    });
    const rels = await store.getRelationships('e1');
    expect(rels).toEqual([
      {
        id: 'r1',
        fromId: 'e1',
        toId: 'e2',
        type: 'KNOWS',
        since: '2020',
        until: '2025',
      },
    ]);
    await store.deleteRelationship('r1');
    const after = await store.getRelationships('e1');
    expect(after).toHaveLength(0);
  });

  it('deletes entities with cascading edges', async () => {
    await store.upsertRelationship({
      id: 'r2',
      fromId: 'e1',
      toId: 'e2',
      type: 'KNOWS',
      since: '2020',
      until: '2025',
    });
    await store.deleteEntity('e1');
    const entities = await store.getEntities({ type: 'Person' });
    expect(entities).toEqual([
      { id: 'e2', type: 'Person', value: 'Bob', label: 'Bob' },
    ]);
    const rels = await store.getRelationships('e2');
    expect(rels).toHaveLength(0);
  });
});
