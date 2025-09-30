/**
 * Migration: Add indexes for compensation log workflows
 * Created: 2025-09-26T12:00:00Z
 */

module.exports = {
  description: 'Add compensation log indexes for tenant scoped lookups',

  /**
   * Apply migration
   * @param {import('neo4j-driver').Session} session Neo4j session
   */
  async up(session) {
    await session.run(
      'CREATE CONSTRAINT comp_log_id IF NOT EXISTS FOR (log:CompensationLog) REQUIRE log.id IS UNIQUE'
    );
    await session.run(
      'CREATE INDEX comp_log_tenant_status IF NOT EXISTS FOR (log:CompensationLog) ON (log.tenantId, log.status)'
    );
    await session.run(
      'CREATE INDEX comp_log_tenant_ts IF NOT EXISTS FOR (log:CompensationLog) ON (log.tenantId, log.timestamp)'
    );
    await session.run(
      'CREATE CONSTRAINT comp_compensator_id IF NOT EXISTS FOR (c:Compensator) REQUIRE c.id IS UNIQUE'
    );
    await session.run(
      'CREATE INDEX comp_compensator_created IF NOT EXISTS FOR (c:Compensator) ON (c.createdAt)'
    );
  },

  /**
   * Rollback migration (optional)
   * @param {import('neo4j-driver').Session} session Neo4j session
   */
  async down(session) {
    await session.run('DROP INDEX comp_log_tenant_status IF EXISTS');
    await session.run('DROP INDEX comp_log_tenant_ts IF EXISTS');
    await session.run('DROP INDEX comp_compensator_created IF EXISTS');
    await session.run('DROP CONSTRAINT comp_log_id IF EXISTS');
    await session.run('DROP CONSTRAINT comp_compensator_id IF EXISTS');
  },
};
