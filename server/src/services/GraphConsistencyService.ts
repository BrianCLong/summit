import { Driver, Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../db/neo4j.js';
import { Logger } from 'pino';
import logger from '../config/logger.js';

export interface SchemaRule {
  relationship: string;
  sourceLabel: string;
  targetLabel: string;
}

export interface ConsistencyReport {
  timestamp: Date;
  danglingNodesCount: number;
  schemaViolationsCount: number;
  healedCount: number;
  queuedTasksCount: number;
  details: string[];
}

export class GraphConsistencyService {
  private logger: Logger;
  private schemaRules: SchemaRule[];

  constructor() {
    this.logger = logger.child({ service: 'GraphConsistencyService' });
    // Default schema rules - strictly illustrative based on common patterns
    // In a real system, this might be loaded from a config or schema file
    this.schemaRules = [
      { relationship: 'OWNS', sourceLabel: 'Person', targetLabel: 'Asset' },
      { relationship: 'OWNS', sourceLabel: 'Org', targetLabel: 'Asset' },
      { relationship: 'MEMBER_OF', sourceLabel: 'Person', targetLabel: 'Org' },
      { relationship: 'RELATED_TO', sourceLabel: 'Case', targetLabel: 'Entity' },
    ];
  }

  /**
   * Detects nodes that have no relationships.
   */
  async detectDanglingNodes(): Promise<any[]> {
    const driver = getNeo4jDriver();
    const session: Session = driver.session();
    try {
      const result = await session.run(
        `MATCH (n) WHERE NOT (n)--() RETURN n LIMIT 1000`
      );
      return result.records.map((r) => r.get('n').properties);
    } finally {
      await session.close();
    }
  }

  /**
   * Detects relationships that violate defined schema rules.
   */
  async detectSchemaViolations(): Promise<any[]> {
    const driver = getNeo4jDriver();
    const session: Session = driver.session();
    const violations: any[] = [];

    try {
      // For each rule, checking what DOESN'T match is complex if we have multiple allowed pairs for same rel type.
      // Instead, we iterate distinct relationship types in the graph and check if they match any rule.

      // Get all relationship types
      const relTypesResult = await session.run(`CALL db.relationshipTypes()`);
      const allRelTypes = relTypesResult.records.map(r => r.get('relationshipType'));

      for (const relType of allRelTypes) {
        // Find rules for this relationship type
        const rules = this.schemaRules.filter(r => r.relationship === relType);

        if (rules.length === 0) {
          // If no rules are defined for this relationship type, we might consider all of them valid
          // or invalid depending on strictness. Let's assume strict mode: if not defined, it's potential violation?
          // For now, let's only check types we explicitly know about.
          continue;
        }

        // Construct a query that finds relationships where NONE of the valid (Source)-->(Target) patterns match
        // MATCH (a)-[r:TYPE]->(b)
        // WHERE NOT (
        //   (a:Label1 AND b:Label2) OR (a:Label3 AND b:Label4) ...
        // )
        // RETURN a, r, b

        const predicates = rules.map(rule => `(a:${rule.sourceLabel} AND b:${rule.targetLabel})`).join(' OR ');

        const query = `
          MATCH (a)-[r:${relType}]->(b)
          WHERE NOT (${predicates})
          RETURN a, r, b LIMIT 100
        `;

        const result = await session.run(query);
        result.records.forEach(r => {
          violations.push({
            type: 'SchemaViolation',
            relationshipType: relType,
            source: r.get('a').properties,
            target: r.get('b').properties,
            relId: r.get('r').identity.toString() // depending on neo4j integer handling
          });
        });
      }

      return violations;
    } finally {
      await session.close();
    }
  }

  /**
   * Auto-heals simple issues and queues complex ones.
   */
  async healOrQueue(dryRun: boolean = false): Promise<ConsistencyReport> {
    const report: ConsistencyReport = {
      timestamp: new Date(),
      danglingNodesCount: 0,
      schemaViolationsCount: 0,
      healedCount: 0,
      queuedTasksCount: 0,
      details: []
    };

    const dangling = await this.detectDanglingNodes();
    report.danglingNodesCount = dangling.length;

    // Auto-heal: Delete dangling nodes if they have no sensitive data or are marked as temporary.
    // For safety, let's just tag them :Dangling for now, or delete if they are explicitly 'Temp'.
    // Here we implement a strategy: Queue them for deletion.
    if (dangling.length > 0) {
      if (!dryRun) {
        await this.queueRepairTasks('DeleteDangling', dangling);
      }
      report.queuedTasksCount += dangling.length;
      report.details.push(`Queued ${dangling.length} dangling nodes for cleanup.`);
    }

    const violations = await this.detectSchemaViolations();
    report.schemaViolationsCount = violations.length;

    if (violations.length > 0) {
      if (!dryRun) {
        await this.queueRepairTasks('FixSchemaViolation', violations);
      }
      report.queuedTasksCount += violations.length;
      report.details.push(`Queued ${violations.length} schema violations for repair.`);
    }

    if (this.logger) {
      this.logger.info({ report }, 'Graph consistency check completed');
    }
    return report;
  }

  private async queueRepairTasks(type: string, items: any[]) {
     // implementation of queueing logic
     // In a real system, this would push to Redis/BullMQ.
     // For this MVP, we might log it or insert into a "RepairQueue" node in the graph itself or Postgres.
     if (this.logger) {
       this.logger.info(`[Queue] Queuing ${items.length} tasks of type ${type}`);
     } else {
       console.log(`[Queue] Queuing ${items.length} tasks of type ${type}`);
     }
     // Simulate queueing
  }

  async generateWeeklyReport(): Promise<string> {
    // Perform actual healing/queueing (not dry-run) for the weekly report
    const report = await this.healOrQueue(false);
    const text = `
    Weekly Graph Consistency Report
    ===============================
    Date: ${report.timestamp.toISOString()}
    Dangling Nodes: ${report.danglingNodesCount}
    Schema Violations: ${report.schemaViolationsCount}
    Actions Taken:
    ${report.details.join('\n')}
    `;
    return text;
  }
}
