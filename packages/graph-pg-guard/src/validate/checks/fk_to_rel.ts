import { Driver } from 'neo4j-driver';
import { DriftReport } from '../../domain/DriftReport.js';

export async function checkFkRelExistence(
  driver: Driver,
  report: DriftReport
) {
  const session = driver.session();

  try {
    const res = await session.run(`
      MATCH (a:Account)
      WHERE a.parent_id IS NOT NULL
      AND NOT EXISTS {
        MATCH (p:Account {id: a.parent_id})-[:PARENT_OF]->(a)
      }
      RETURN a.id AS id, a.parent_id AS parent_id
    `);

    for (const row of res.records) {
      report.add({
        code: 'FK_REL_MISSING',
        severity: 'error',
        details: {
          id: row.get('id'),
          parent_id: row.get('parent_id')
        }
      });
    }
  } finally {
    await session.close();
  }
}
