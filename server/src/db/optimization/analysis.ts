// @ts-nocheck

import { getNeo4jDriver } from '../neo4j.js';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logger = pino({ name: 'query-analyzer' });

async function analyzeSlowQueries() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    logger.info('Starting slow query analysis...');

    // Attempt to retrieve active queries if running on Enterprise or compatible setup
    // This is a best-effort approach since we can't guarantee query log access
    try {
        const result = await session.run(`
            CALL dbms.listQueries() YIELD queryId, query, elapsedTimeMillis, status
            WHERE status = 'running' AND elapsedTimeMillis > 1000
            RETURN queryId, query, elapsedTimeMillis
            ORDER BY elapsedTimeMillis DESC LIMIT 10
        `);

        const slowQueries = result.records.map(r => ({
            queryId: r.get('queryId'),
            query: r.get('query'),
            elapsedTimeMillis: r.get('elapsedTimeMillis')
        }));

        if (slowQueries.length > 0) {
            logger.info({ slowQueries }, 'Found currently running slow queries');
            fs.writeFileSync(
                path.join(process.cwd(), 'server/src/db/optimization/slow-queries-live.json'),
                JSON.stringify(slowQueries, null, 2)
            );
        } else {
            logger.info('No slow queries currently running > 1000ms');
        }

    } catch (err) {
        logger.warn('Could not list running queries (requires admin/enterprise privileges): ' + err.message);
    }

    // Profiling known critical patterns
    const criticalQueries = [
      { name: 'EntityByEmail', cypher: `MATCH (p:Person)-[:KNOWS]->(f:Person) WHERE p.email = $email RETURN f` },
      { name: 'EntitySearch', cypher: `MATCH (n) WHERE n.name CONTAINS $name RETURN n` }
    ];

    const results = [];

    for (const q of criticalQueries) {
      try {
        const result = await session.run(`EXPLAIN ${q.cypher}`, { email: 'test@example.com', name: 'test' });
        const plan = result.summary.plan;

        const hasFullScan = JSON.stringify(plan).includes('NodeByLabelScan') || JSON.stringify(plan).includes('AllNodesScan');

        results.push({
            name: q.name,
            query: q.cypher,
            hasFullScan,
            planType: plan ? plan.operatorType : 'Unknown'
        });
      } catch (err) {
        logger.error({ err, query: q.cypher }, 'Failed to profile query');
      }
    }

    fs.writeFileSync(
      path.join(process.cwd(), 'server/src/db/optimization/analysis-report.json'),
      JSON.stringify(results, null, 2)
    );

    logger.info('Analysis complete. Report saved.');

  } catch (error) {
    logger.error('Error during analysis', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

// analyzeSlowQueries();
export { analyzeSlowQueries };
