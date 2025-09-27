import request from 'supertest';
import { createApp } from '../app';
import { getNeo4jDriver, getRedisClient, connectNeo4j, connectRedis } from '../config/database';

async function seedGraph() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    await session.run('MATCH (n) DETACH DELETE n');
    const nodes = [] as any[];
    for (let i = 1; i <= 10; i++) {
      nodes.push({
        id: `e${i}`,
        type: 'Entity',
        label: `Entity ${i}`,
        description: `desc ${i}`,
        investigationId: 'inv1',
        confidence: 0.9,
        createdAt: i,
      });
    }
    const rels = [] as any[];
    let relId = 1;
    for (let i = 1; i <= 12; i++) {
      const from = `e${((i - 1) % 10) + 1}`;
      const to = `e${((i % 10) + 1)}`;
      rels.push({
        id: `r${relId++}`,
        from,
        to,
        type: 'REL',
        confidence: 0.5 + i * 0.01,
        createdAt: i,
        investigationId: 'inv1',
      });
    }
    await session.run(
      `UNWIND $nodes as n
       CREATE (:Entity {id:n.id,type:n.type,label:n.label,description:n.description,investigationId:n.investigationId,confidence:n.confidence,createdAt:n.createdAt});`,
      { nodes },
    );
    await session.run(
      `UNWIND $rels as r
       MATCH (a:Entity {id:r.from, investigationId:r.investigationId})
       MATCH (b:Entity {id:r.to, investigationId:r.investigationId})
       CREATE (a)-[:RELATIONSHIP {id:r.id,type:r.type,fromEntityId:r.from,toEntityId:r.to,confidence:r.confidence,createdAt:r.createdAt}]->(b);`,
      { rels },
    );
  } finally {
    await session.close();
  }
}

describe('askGraphRag', () => {
  let server: any;

  beforeAll(async () => {
    await connectNeo4j();
    await connectRedis();
    await seedGraph();
    const app = await createApp();
    server = app.listen(0);
    const redis = getRedisClient();
    await redis?.flushdb();
  });

  afterAll(async () => {
    await server.close();
  });

  test('returns answer with citations and paths and caches', async () => {
    const query = `query($inv:ID!,$q:String!,$focus:[ID!],$hops:Int){askGraphRag(investigationId:$inv,question:$q,focusEntityIds:$focus,maxHops:$hops){answer citations{entityId snippet} why_paths{path score} used_context_stats{nodes edges}}}`;
    const variables = { inv: 'inv1', q: 'test?', focus: ['e1'], hops: 2 };
    const start1 = Date.now();
    const res1 = await request(server).post('/graphql').send({ query, variables });
    const dur1 = Date.now() - start1;
    const data1 = res1.body.data.askGraphRag;
    expect(data1.citations.length).toBeGreaterThan(0);
    expect(data1.why_paths.length).toBeGreaterThan(0);
    const threshold = Number(process.env.GRAPHRAG_P95 || 1500);
    expect(dur1).toBeLessThanOrEqual(threshold);
    expect(dur1).toBeGreaterThanOrEqual(200);
    const redis = getRedisClient();
    const size1 = await redis?.dbsize();
    expect(size1).toBeGreaterThan(0);

    const start2 = Date.now();
    const res2 = await request(server).post('/graphql').send({ query, variables });
    const dur2 = Date.now() - start2;
    expect(dur2).toBeLessThan(dur1 / 2);
    const data2 = res2.body.data.askGraphRag;
    expect(data2.citations.length).toBeGreaterThan(0);
  });
});
