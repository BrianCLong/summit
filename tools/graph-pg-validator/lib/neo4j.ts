import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI || "bolt://localhost:7687",
      neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "password")
    );
  }
  return driver;
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
