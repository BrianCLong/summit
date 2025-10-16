import type { Driver } from 'neo4j-driver';

export async function waitForNeo4j(
  driver: Driver,
  timeoutMs = 30000,
): Promise<boolean> {
  const start = Date.now();
  let delay = 250;
  while (Date.now() - start < timeoutMs) {
    try {
      await driver.verifyConnectivity();
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 2000);
    }
  }
  throw new Error('Neo4j connectivity timeout');
}
