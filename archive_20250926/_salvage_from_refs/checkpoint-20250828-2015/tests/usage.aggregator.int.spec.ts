import { startUsageAggregator } from '../server/src/usage/aggregator';
import { publish } from '../server/src/stream/kafka';
import { Pool } from 'pg';
import { Kafka, Admin } from 'kafkajs';

// Integration test for the usage aggregator service.

describe('Usage Aggregator Integration', () => {
  let pgPool: Pool;
  let kafkaClient: Kafka;
  let kafkaAdmin: Admin;

  const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_FEATURE = 'graph.query';
  const USAGE_TOPIC = 'intelgraph.usage.v1';

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    if (!process.env.KAFKA_BROKERS) {
      throw new Error('KAFKA_BROKERS environment variable is not set.');
    }

    pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    kafkaClient = new Kafka({ clientId: 'test-aggregator', brokers: process.env.KAFKA_BROKERS.split(',') });
    kafkaAdmin = kafkaClient.admin();

    // Ensure Kafka topic exists (optional, but good for robust tests)
    await kafkaAdmin.connect();
    const topics = await kafkaAdmin.listTopics();
    if (!topics.includes(USAGE_TOPIC)) {
      await kafkaAdmin.createTopics({ topics: [{ topic: USAGE_TOPIC }] });
    }
    await kafkaAdmin.disconnect();

    // Start the usage aggregator in the background
    startUsageAggregator();

    // Clear previous test data
    await pgPool.query('DELETE FROM usage_event WHERE tenant_id = $1', [TEST_TENANT_ID]);
  }, 30000); // Increased timeout for service startup

  afterAll(async () => {
    await pgPool.end();
  });

  it('should store usage events in the database', async () => {
    const initialCount = (await pgPool.query('SELECT COUNT(*) FROM usage_event WHERE tenant_id = $1', [TEST_TENANT_ID])).rows[0].count;
    expect(parseInt(initialCount)).toBe(0);

    // Publish a usage event to Kafka
    await publish(USAGE_TOPIC, `${TEST_TENANT_ID}:${TEST_FEATURE}`, {
      tenantId: TEST_TENANT_ID,
      feature: TEST_FEATURE,
      amount: 1,
      ts: new Date().toISOString(),
      attrs: { source: 'test-script' },
    });

    // Poll the database until the event appears
    let currentCount = 0;
    const maxAttempts = 10;
    let attempts = 0;
    while (currentCount === 0 && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      currentCount = (await pgPool.query('SELECT COUNT(*) FROM usage_event WHERE tenant_id = $1', [TEST_TENANT_ID])).rows[0].count;
      attempts++;
    }

    expect(parseInt(currentCount)).toBe(1);

    const storedEvent = (await pgPool.query('SELECT * FROM usage_event WHERE tenant_id = $1', [TEST_TENANT_ID])).rows[0];
    expect(storedEvent.feature).toBe(TEST_FEATURE);
    expect(storedEvent.amount).toBe(1);
    expect(storedEvent.tenant_id).toBe(TEST_TENANT_ID);
  }, 20000); // Increased timeout for polling
});
