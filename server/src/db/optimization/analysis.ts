import { getNeo4jDriver } from '../neo4j.js';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logger = (pino as any)({ name: 'query-analyzer' });

interface PlanStats {
  operatorType: string;
  dbHits: number;
  rows: number;
  indexes: string[];
}

const GRAPHIKA_TARGETS = {
  p95Ms: 400,
  p99Ms: 750,
};

function extractPlanStats(plan: any): PlanStats {
  if (!plan) {
    return { operatorType: 'unknown', dbHits: 0, rows: 0, indexes: [] };
  }

  const indexes: string[] = [];

  function walk(node: any): { dbHits: number; rows: number } {
    let hits = node.dbHits || 0;
    let rows = node.rows || 0;

    if (node.operatorType && node.operatorType.toLowerCase().includes('index')) {
      indexes.push(node.operatorType);
    }

    if (node.children) {
      for (const child of node.children) {
        const childStats = walk(child);
        hits += childStats.dbHits;
        rows += childStats.rows;
      }
    }

    return { dbHits: hits, rows };
  }

  const totals = walk(plan);

  return {
    operatorType: plan.operatorType || 'unknown',
    dbHits: totals.dbHits,
    rows: totals.rows,
    indexes: [...new Set(indexes)],
  };
}

async function profileJourney(
  session: any,
  name: string,
  cypher: string,
  params: Record<string, any>,
) {
  const started = Date.now();
  const profiled = await session.run(`PROFILE ${cypher}`, params);
  const durationMs = Date.now() - started;

  const summary = profiled.summary;
  const plan = summary.profile || summary.plan;
  const planStats = extractPlanStats(plan);

  return {
    name,
    cypher,
    params,
    durationMs,
    plan: {
      operator: planStats.operatorType,
      dbHits: planStats.dbHits,
      rows: planStats.rows,
      indexes: planStats.indexes,
    },
  };
}

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

        const slowQueries = result.records.map((r: any) => ({
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

    } catch (err: any) {
        logger.warn('Could not list running queries (requires admin/enterprise privileges): ' + err.message);
    }

    // Profiling known critical patterns with EXPLAIN snapshots
    const criticalQueries = [
      {
        name: 'EntityByEmail',
        cypher: `MATCH (p:Person)-[:KNOWS]->(f:Person) WHERE p.email = $email RETURN f`,
        params: { email: 'test@example.com' },
      },
      {
        name: 'EntitySearch',
        cypher: `MATCH (n) WHERE n.name CONTAINS $name RETURN n`,
        params: { name: 'test' },
      },
    ];

    const criticalExplain = [];

    for (const q of criticalQueries) {
      try {
        const result = await session.run(`EXPLAIN ${q.cypher}`, q.params);
        const plan = result.summary.plan;

        const hasFullScan =
          JSON.stringify(plan).includes('NodeByLabelScan') ||
          JSON.stringify(plan).includes('AllNodesScan');

        criticalExplain.push({
          name: q.name,
          query: q.cypher,
          params: q.params,
          hasFullScan,
          planType: plan ? plan.operatorType : 'Unknown',
        });
      } catch (err: any) {
        logger.error({ err, query: q.cypher }, 'Failed to profile query');
      }
    }

    // PROFILE the top user journeys: entity expansion, shortest path, community search
    const journeyProfiles = [];
    const journeyQueries = [
      {
        name: 'entity-expansion',
        cypher: `
          MATCH (seed:Entity {id: $seedId, tenantId: $tenantId})
          CALL apoc.path.expandConfig(seed, {
            relationshipFilter: 'RELATED_TO|RELATIONSHIP>',
            labelFilter: 'Entity',
            minLevel: 1,
            maxLevel: $maxLevel,
            bfs: true,
            limit: 200,
            uniqueness: 'NODE_PATH'
          }) YIELD path
          RETURN path
          LIMIT 25
        `,
        params: { seedId: 'seed-1', tenantId: 'tenant-rc', maxLevel: 3 },
      },
      {
        name: 'shortest-path',
        cypher: `
          MATCH (a:Entity {id: $fromId, tenantId: $tenantId}), (b:Entity {id: $toId, tenantId: $tenantId})
          CALL apoc.algo.dijkstraWithDefaultWeight(a, b, 'RELATED_TO|RELATIONSHIP>', 'cost', 1.0, $maxDepth) YIELD path, weight
          RETURN path, weight
          LIMIT 1
        `,
        params: {
          fromId: 'entity-from',
          toId: 'entity-to',
          tenantId: 'tenant-rc',
          maxDepth: 6,
        },
      },
      {
        name: 'community-search',
        cypher: `
          CALL gds.louvain.stream('communityGraph', { seedProperty: 'tenantId', concurrency: 4 })
          YIELD nodeId, communityId
          RETURN gds.util.asNode(nodeId) AS node, communityId
          LIMIT 200
        `,
        params: {},
      },
    ];

    for (const journey of journeyQueries) {
      try {
        const profiled = await profileJourney(session, journey.name, journey.cypher, journey.params);
        journeyProfiles.push(profiled);
      } catch (err: any) {
        logger.error({ err, journey: journey.name }, 'Failed to PROFILE journey');
      }
    }

    // Analyze label cardinality to recommend narrower labels
    const labelStats: Array<{ label: string; count: number; advice?: string }> = [];
    try {
      const counts = await session.run(`CALL db.stats.retrieve('GRAPH COUNTS') YIELD data RETURN data`);
      const records = counts.records[0]?.get('data') ?? {};
      const labels = records['nodeCountByLabel'] || {};

      Object.entries(labels).forEach(([label, count]: [string, any]) => {
        const numericCount = typeof count === 'object' ? count['count'] : count;
        const advice = numericCount > 500000
          ? 'High cardinality—consider splitting :Entity into :Person/:Org/:Document to raise selectivity'
          : undefined;
        labelStats.push({ label, count: numericCount, advice });
      });
    } catch (err: any) {
      logger.warn({ err }, 'Failed to collect label cardinality stats');
    }

    const report = {
      timestamp: new Date().toISOString(),
      explainSnapshots: criticalExplain,
      journeyProfiles,
      labelCardinality: labelStats,
      targets: GRAPHIKA_TARGETS,
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'server/src/db/optimization/analysis-report.json'),
      JSON.stringify(report, null, 2)
    );

    logger.info('Analysis complete. Report saved.');

  } catch (error: any) {
    logger.error('Error during analysis', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

// analyzeSlowQueries();
export { analyzeSlowQueries };
