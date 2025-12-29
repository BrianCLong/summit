// @ts-nocheck
import * as neo4j from 'neo4j-driver';
import { Neo4jContainer, StartedNeo4jContainer } from '@testcontainers/neo4j';

/**
 * A simple audit logger to record sandbox execution.
 * In a real-world scenario, this would integrate with a proper logging service.
 * @param {string} cypher The query being executed.
 * @param {'success' | 'failure'} status The outcome of the execution.
 * @param {string} [errorMessage] The error message if the execution failed.
 */
function auditLog(cypher, status, errorMessage) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event: 'sandbox_execution',
        status,
        cypher,
        errorMessage,
    };
    // For now, just log to the console.
    console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
}

/**
 * Executes a Cypher query in a sandboxed, temporary Neo4j container.
 * All operations, including mutations (CREATE, MERGE, DELETE), are performed
 * within a transaction that is ALWAYS rolled back. This allows for previewing
 * the results of a query without persisting any changes to the database.
 *
 * @param {string} cypher The Cypher query to execute.
 * @param {number} rowLimit The maximum number of rows to return.
 * @returns {Promise<Array<Record<string, any>>>} A promise that resolves with the query results.
 */
export async function executeSandbox(cypher, rowLimit = 100) {
  let container;
  try {
    container = await new Neo4jContainer('neo4j:5')
      .withPassword('password')
      .start();
  } catch (error) {
    console.error('Failed to start Neo4j container for sandbox execution.', error);
    throw new Error('Neo4j container unavailable');
  }

  const uri = container.getBoltUri();
  const driver = neo4j.driver(uri, neo4j.auth.basic('neo4j', 'password'));
  const session = driver.session();
  const tx = session.beginTransaction();

  try {
    // Append a LIMIT clause to prevent overly large result sets.
    const limitedCypher = `${cypher} LIMIT ${rowLimit}`;
    const result = await tx.run(limitedCypher);
    const records = result.records.map((r) => r.toObject());

    auditLog(cypher, 'success');

    return records;
  } catch (error) {
    auditLog(cypher, 'failure', error.message);
    // Re-throw the original error to the caller
    throw error;
  } finally {
    // This is the most critical part of the sandbox.
    // We always roll back the transaction, ensuring any mutations are discarded.
    // This makes the entire operation idempotent from a data state perspective.
    if (tx) {
        await tx.rollback();
    }
    if (session) {
        await session.close();
    }
    if (driver) {
        await driver.close();
    }
    if (container) {
        await container.stop();
    }
  }
}
