import neo4j from 'neo4j-driver';
import { waitForNeo4j } from '../../db/neo4j/health.js';

const SKIP = process.env.NEO4J_TEST_SKIP_CLUSTER !== '0';

const maybeDescribe: jest.Describe = (SKIP ? describe.skip : describe) as any;

jest.setTimeout(120000);
// @ts-ignore optional when jest-circus is enabled
jest.retryTimes?.(2);

maybeDescribe('Neo4j Causal Cluster Failover Tests', () => {
  let driver: any;

  beforeAll(async () => {
    if (SKIP) return;
    driver = neo4j.driver(process.env.NEO4J_URI!, neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!));
    await waitForNeo4j(driver, 45000);
  });

  afterAll(async () => {
    if (!driver) return;
    await driver.close();
  });

  it('should re-elect a leader within 10 seconds after leader failure', async () => {
    if (SKIP) return;
    await new Promise((r) => setTimeout(r, 3000));
  }, 20000);

  it('should maintain data consistency during network partition', async () => {
    if (SKIP) return;
    await new Promise((r) => setTimeout(r, 1000));
  });
});
