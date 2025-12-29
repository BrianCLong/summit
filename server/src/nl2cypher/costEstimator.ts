// server/src/nl2cypher/costEstimator.ts
import * as neo4j from 'neo4j-driver';
import { ParseResult } from './parser';
import { generateCypher } from './cypherGenerator';

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'devpassword';

let driver: neo4j.Driver;

function getDriver(): neo4j.Driver {
  if (!driver) {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

function parseEstimatedRows(details: string): number {
    const match = /EstimatedRows:\s*([\d.eE+-]+)/.exec(details);
    return match ? parseFloat(match[1]) : 0;
}

function getPlanCost(plan: any): number {
    if (!plan) return 0;
    let cost = parseEstimatedRows(plan.details || '');
    if (plan.children) {
        for (const child of plan.children) {
            cost += getPlanCost(child);
        }
    }
    return cost;
}

export async function estimateCost(ast: ParseResult): Promise<number> {
  const cypher = generateCypher(ast);
  const explainQuery = `EXPLAIN ${cypher}`;

  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(explainQuery);
    if (result.records.length > 0) {
        const record = result.records[0];
        const plan = record.get(record.keys[0]);
        const cost = getPlanCost(plan);
        return Math.max(1, Math.round(cost));
    }
    return 1;
  } catch (error) {
    console.error('Error estimating query cost:', error);
    return 1_000_000;
  } finally {
    await session.close();
  }
}
