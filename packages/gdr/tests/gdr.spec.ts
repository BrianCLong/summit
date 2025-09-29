import { GDR } from '../src';
import neo4j, { Driver } from 'neo4j-driver';

describe('GDR', () => {
  let gdr: GDR;
  let driver: Driver;

  beforeAll(async () => {
    // Connect to a test Neo4j instance or mock it
    driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
    gdr = new GDR('bolt://localhost:7687', 'neo4j', 'password');

    // Clear existing data and create some test data
    const session = driver.session();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      await session.run('CREATE (a:Node {id: \'a\'})-[:HAS_PROVENANCE]->(p:Provenance {id: \'p1\'})');
      await session.run('CREATE (b:Node {id: \'b\'})'); // Node without provenance
      await session.run('CREATE (c:Node {id: \'c\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(d:Node {id: \'d\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(e:Node {id: \'e\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(f:Node {id: \'f\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(g:Node {id: \'g\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(h:Node {id: \'h\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(i:Node {id: \'i\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(j:Node {id: \'j\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(k:Node {id: \'k\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(l:Node {id: \'l\'})');
      await session.run('CREATE (c)-[:RELATED_TO]->(m:Node {id: \'m\'})'); // High degree node
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    await gdr.close();
    await driver.close();
  });

  test('should detect provenance anomalies', async () => {
    const anomalies = await gdr.detectProvenanceAnomalies();
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'b', reason: 'Node lacks provenance information.' }),
      expect.objectContaining({ nodeId: 'c', reason: 'High-degree node without witness paths.' }),
    ]));
  });
});
