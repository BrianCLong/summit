/**
 * Migration: ERDecision Idempotency Constraints
 * Created: 2025-12-27
 */

module.exports = {
  description: 'ERDecision idempotency and merge constraints',

  /**
   * Apply migration
   * @param {Session} session Neo4j session
   */
  async up(session) {
    const constraints = [
      'CREATE CONSTRAINT er_decision_id_unique IF NOT EXISTS FOR (d:ERDecision) REQUIRE d.id IS UNIQUE',
      'CREATE CONSTRAINT er_decision_merge_id_unique IF NOT EXISTS FOR (d:ERDecision) REQUIRE d.mergeId IS UNIQUE',
      'CREATE CONSTRAINT er_decision_idempotency_key_unique IF NOT EXISTS FOR (d:ERDecision) REQUIRE d.idempotencyKey IS UNIQUE',
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
  },

  /**
   * Rollback migration (optional)
   * @param {Session} session Neo4j session
   */
  async down(session) {
    const drops = [
      'DROP CONSTRAINT er_decision_id_unique IF EXISTS',
      'DROP CONSTRAINT er_decision_merge_id_unique IF EXISTS',
      'DROP CONSTRAINT er_decision_idempotency_key_unique IF EXISTS',
    ];

    for (const drop of drops) {
      try {
        await session.run(drop);
        console.log(`✅ Dropped constraint: ${drop.split(' ')[2]}`);
      } catch (error) {
        console.warn(`⚠️  Failed to drop constraint: ${error.message}`);
      }
    }
  },
};
