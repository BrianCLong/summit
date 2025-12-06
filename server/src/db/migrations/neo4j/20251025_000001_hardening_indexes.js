/**
 * Migration: Hardening Indexes (Phase 1)
 * Created: 2025-10-25
 * Description: Adds missing indexes for snake_case properties used in analytics and frequent lookups.
 */

module.exports = {
  description: 'Hardening Indexes - Add support for analytics queries and optimize lookups',

  /**
   * Apply migration
   * @param {Session} session Neo4j session
   */
  async up(session) {
    console.log('🔄 Applying index hardening...');

    const indexes = [
      // Fix for Snake-Case Mismatch in Analytics
      // GraphAnalyticsService uses investigation_id (snake_case) but previous indexes were investigationId (camelCase)
      'CREATE INDEX entity_investigation_id_snake_idx IF NOT EXISTS FOR (e:Entity) ON (e.investigation_id)',
      'CREATE INDEX relationship_investigation_id_snake_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.investigation_id)',

      // Optimize generic label lookup
      'CREATE INDEX entity_label_property_idx IF NOT EXISTS FOR (e:Entity) ON (e.label)',

      // Ensure tenant isolation performance (hardening)
      'CREATE INDEX entity_tenant_id_idx IF NOT EXISTS FOR (e:Entity) ON (e.tenantId)',

      // Add index for type discriminator if not present (often used in filters)
      'CREATE INDEX entity_type_property_idx IF NOT EXISTS FOR (e:Entity) ON (e.type)'
    ];

    for (const index of indexes) {
      try {
        await session.run(index);
        console.log(`✅ Created index: ${index.split(' ')[2]}`);
      } catch (error) {
        // Ignore "already exists" errors if IF NOT EXISTS fails for some reason or race condition
        if (
          !error.message.includes('already exists') &&
          !error.message.includes('An equivalent')
        ) {
          console.warn(`⚠️  Failed to create index: ${error.message}`);
        } else {
            console.log(`ℹ️  Index already exists: ${index.split(' ')[2]}`);
        }
      }
    }

    console.log('✅ Index hardening completed successfully');
  },

  /**
   * Rollback migration
   * @param {Session} session Neo4j session
   */
  async down(session) {
    console.log('🔄 Rolling back index hardening...');

    const indexesToDrop = [
      'DROP INDEX entity_investigation_id_snake_idx IF EXISTS',
      'DROP INDEX relationship_investigation_id_snake_idx IF EXISTS',
      'DROP INDEX entity_label_property_idx IF EXISTS',
      // We don't drop tenant_id or type indexes as they might have been created by 001 or needed critically
    ];

    for (const dropIndex of indexesToDrop) {
      try {
        await session.run(dropIndex);
        console.log(`✅ Dropped index: ${dropIndex.split(' ')[2]}`);
      } catch (error) {
        console.warn(`⚠️  Failed to drop index: ${error.message}`);
      }
    }

    console.log('✅ Index hardening rollback completed');
  }
};
