// @ts-nocheck
import neo4j from 'neo4j-driver';
import { getNeo4jDriver } from '../config/database';

export async function executeSandbox(cypher: string, rowLimit = 10) {
  if (/(CREATE|MERGE|DELETE|SET|DROP|REMOVE|CALL|LOAD)/i.test(cypher)) {
    throw new Error('Mutations are not allowed');
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  try {
    const result = await session.run(`${cypher} LIMIT ${Math.floor(Number(rowLimit))}`);
    return result.records.map((r: any) => r.toObject());
  } finally {
    await session.close();
  }
}
