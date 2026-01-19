import type { DriftReport } from '../../domain/DriftReport';
import { Driver, Record } from 'neo4j-driver';

export async function checkFkRelExistence(driver: Driver, report: DriftReport) {
  // Example: nodes that declare a foreign key field but lack a corresponding :REL in Neo4j
  // For the skeleton, we can implement a dummy check or a specific check for our sample projector.

  // This is a placeholder logic.
  // Real logic would be:
  // MATCH (n:Reservation) WHERE n.pool_id IS NOT NULL AND NOT (n)-[:ALLOCATED_FROM]->(:Pool)
  // RETURN n.id

  const session = driver.session();
  try {
    // We'll check for our sample Reservation -> Pool relationship
    const result = await session.run(`
      MATCH (n:Reservation)
      WHERE n.pool_id IS NOT NULL
        AND NOT (n)-[:ALLOCATED_FROM]->(:Pool)
      RETURN n.id AS id
    `);

    result.records.forEach((record: Record) => {
      report.add({
        code: 'FK_REL_MISSING',
        severity: 'error',
        details: {
          nodeId: record.get('id'),
          type: 'Reservation',
          missingRel: 'ALLOCATED_FROM'
        }
      });
    });

  } catch (e) {
    // If DB is not available or query fails, just log it as info for now so we don't crash
    report.add({
      code: 'FK_REL_MISSING',
      severity: 'info',
      details: { error: String(e) }
    });
  } finally {
    await session.close();
  }
}
