
/**
 * Adversarial Verification Wrapper
 * Sets up environment before importing sensitive modules
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-!!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long-!!!';
process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'password';

async function run() {
  const { runAdversarialSuite } = await import('./adversarial-verify-logic');
  await runAdversarialSuite();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
