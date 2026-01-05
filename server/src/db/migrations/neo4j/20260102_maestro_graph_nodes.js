/**
 * Migration: Maestro graph nodes and edges
 * Created: 2026-01-02
 */

module.exports = {
  description: 'Maestro graph nodes and edge constraints',

  /**
   * Apply migration
   * @param {Session} session Neo4j session
   */
  async up(session) {
    const constraints = [
      'CREATE CONSTRAINT maestro_run_id_unique IF NOT EXISTS FOR (r:MaestroRun) REQUIRE r.id IS UNIQUE',
      'CREATE CONSTRAINT maestro_step_id_unique IF NOT EXISTS FOR (s:MaestroStep) REQUIRE s.id IS UNIQUE',
      'CREATE CONSTRAINT maestro_receipt_id_unique IF NOT EXISTS FOR (r:MaestroReceipt) REQUIRE r.id IS UNIQUE',
      'CREATE CONSTRAINT maestro_approval_id_unique IF NOT EXISTS FOR (a:MaestroApproval) REQUIRE a.id IS UNIQUE',
    ];

    const indexes = [
      'CREATE INDEX maestro_run_tenant_idx IF NOT EXISTS FOR (r:MaestroRun) ON (r.tenantId)',
      'CREATE INDEX maestro_run_status_idx IF NOT EXISTS FOR (r:MaestroRun) ON (r.status)',
      'CREATE INDEX maestro_step_run_idx IF NOT EXISTS FOR (s:MaestroStep) ON (s.runId)',
      'CREATE INDEX maestro_step_status_idx IF NOT EXISTS FOR (s:MaestroStep) ON (s.status)',
      'CREATE INDEX maestro_receipt_run_idx IF NOT EXISTS FOR (r:MaestroReceipt) ON (r.runId)',
      'CREATE INDEX maestro_receipt_step_idx IF NOT EXISTS FOR (r:MaestroReceipt) ON (r.stepId)',
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
        console.log(`✅ Created constraint: ${constraint.split(' ')[2]}`);
      } catch (error) {
        if (
          !error.message.includes('already exists') &&
          !error.message.includes('An equivalent')
        ) {
          console.warn(`⚠️  Failed to create constraint: ${error.message}`);
        }
      }
    }

    for (const index of indexes) {
      try {
        await session.run(index);
        console.log(`✅ Created index: ${index.split(' ')[2]}`);
      } catch (error) {
        if (
          !error.message.includes('already exists') &&
          !error.message.includes('An equivalent')
        ) {
          console.warn(`⚠️  Failed to create index: ${error.message}`);
        }
      }
    }
  },

  /**
   * Rollback migration (optional)
   * @param {Session} session Neo4j session
   */
  async down(session) {
    const drops = [
      'DROP CONSTRAINT maestro_run_id_unique IF EXISTS',
      'DROP CONSTRAINT maestro_step_id_unique IF EXISTS',
      'DROP CONSTRAINT maestro_receipt_id_unique IF EXISTS',
      'DROP CONSTRAINT maestro_approval_id_unique IF EXISTS',
      'DROP INDEX maestro_run_tenant_idx IF EXISTS',
      'DROP INDEX maestro_run_status_idx IF EXISTS',
      'DROP INDEX maestro_step_run_idx IF EXISTS',
      'DROP INDEX maestro_step_status_idx IF EXISTS',
      'DROP INDEX maestro_receipt_run_idx IF EXISTS',
      'DROP INDEX maestro_receipt_step_idx IF EXISTS',
    ];

    for (const drop of drops) {
      try {
        await session.run(drop);
        console.log(`✅ Dropped constraint/index: ${drop.split(' ')[2]}`);
      } catch (error) {
        console.warn(`⚠️  Failed to drop constraint/index: ${error.message}`);
      }
    }
  },
};
