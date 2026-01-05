// server/src/db/migrations/neo4j/20260105_maestro_schema.js
const { getDriver } = require('../../neo4j');

module.exports = {
  up: async () => {
    const driver = getDriver();
    const session = driver.session();

    try {
      // 1. Constraints for WorkflowDefinition
      await session.run(`
        CREATE CONSTRAINT workflow_definition_id_unique IF NOT EXISTS
        FOR (n:WorkflowDefinition) REQUIRE n.id IS UNIQUE
      `);
      await session.run(`
        CREATE INDEX workflow_definition_tenant IF NOT EXISTS
        FOR (n:WorkflowDefinition) ON (n.tenantId)
      `);

      // 2. Constraints for Run
      await session.run(`
        CREATE CONSTRAINT run_id_unique IF NOT EXISTS
        FOR (n:Run) REQUIRE n.id IS UNIQUE
      `);
      await session.run(`
        CREATE INDEX run_tenant_status IF NOT EXISTS
        FOR (n:Run) ON (n.tenantId, n.status)
      `);

      // 3. Constraints for Step
      await session.run(`
        CREATE CONSTRAINT step_id_unique IF NOT EXISTS
        FOR (n:Step) REQUIRE n.id IS UNIQUE
      `);
       await session.run(`
        CREATE INDEX step_run_id IF NOT EXISTS
        FOR (n:Step) ON (n.runId)
      `);

      // 4. Constraints for Artifact
      await session.run(`
        CREATE CONSTRAINT artifact_id_unique IF NOT EXISTS
        FOR (n:Artifact) REQUIRE n.id IS UNIQUE
      `);

      // 5. Constraints for ApprovalRequest
      await session.run(`
        CREATE CONSTRAINT approval_request_id_unique IF NOT EXISTS
        FOR (n:ApprovalRequest) REQUIRE n.id IS UNIQUE
      `);

      // 6. Constraints for PolicyDecision
      await session.run(`
        CREATE CONSTRAINT policy_decision_id_unique IF NOT EXISTS
        FOR (n:PolicyDecision) REQUIRE n.id IS UNIQUE
      `);

      // 7. Constraints for Receipt
      await session.run(`
        CREATE CONSTRAINT receipt_id_unique IF NOT EXISTS
        FOR (n:Receipt) REQUIRE n.id IS UNIQUE
      `);

      console.log('Applied Maestro schema constraints and indexes.');
    } finally {
      await session.close();
    }
  },

  down: async () => {
    const driver = getDriver();
    const session = driver.session();

    try {
      await session.run('DROP CONSTRAINT workflow_definition_id_unique IF EXISTS');
      await session.run('DROP INDEX workflow_definition_tenant IF EXISTS');
      await session.run('DROP CONSTRAINT run_id_unique IF EXISTS');
      await session.run('DROP INDEX run_tenant_status IF EXISTS');
      await session.run('DROP CONSTRAINT step_id_unique IF EXISTS');
      await session.run('DROP INDEX step_run_id IF EXISTS');
      await session.run('DROP CONSTRAINT artifact_id_unique IF EXISTS');
      await session.run('DROP CONSTRAINT approval_request_id_unique IF EXISTS');
      await session.run('DROP CONSTRAINT policy_decision_id_unique IF EXISTS');
      await session.run('DROP CONSTRAINT receipt_id_unique IF EXISTS');
    } finally {
      await session.close();
    }
  },
};
