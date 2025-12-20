import { KafkaProducerWrapper } from '../src/streaming/KafkaProducer.js';
import { MockSchemaRegistry, GlueSchemaRegistry } from '../src/streaming/SchemaRegistry.js';
import { EventFactory } from '../src/streaming/EventFactory.js';
import { Logger } from '../src/streaming/Logger.js';

const logger = new Logger('LoadTest');

const RATE = parseInt(process.env.RATE || '100', 10); // events per second
const DURATION = parseInt(process.env.DURATION || '10', 10); // seconds
const TOPIC = process.env.TOPIC || 'load-test-topic';
const USE_GLUE = process.env.USE_GLUE === 'true';
const REGION = process.env.AWS_REGION || 'us-east-1';
const REGISTRY = process.env.REGISTRY_NAME || 'summit-registry';
const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

async function run() {
  logger.info(`Starting Load Test: ${RATE} msg/s for ${DURATION}s on topic ${TOPIC}`);

  const registry = USE_GLUE
    ? new GlueSchemaRegistry(REGION, REGISTRY)
    : new MockSchemaRegistry();

  if (!USE_GLUE) {
    // Pre-register if mock
    await (registry as MockSchemaRegistry).register(TOPIC, {});
  }

  const producer = new KafkaProducerWrapper({
    clientId: 'load-tester',
    brokers: BROKERS,
    schemaRegistry: registry,
  });

  await producer.connect();

  const totalMessages = RATE * DURATION;
  let sent = 0;
  const startTime = Date.now();

  const interval = setInterval(async () => {
    if (Date.now() - startTime > DURATION * 1000) {
      clearInterval(interval);
      await producer.disconnect();
      logger.info(`Load Test Complete. Sent ${sent} messages.`);
      process.exit(0);
    }

    // Burst send for this second (simplified, assumes interval fires roughly accurately or we catch up)
    // Better: use a loop with sleep, or tick every 100ms.
    // Here we do 10 ticks per second.
  }, 100);

  // Accurate rate limiter loop
  // We'll use a tight loop with target time
  clearInterval(interval); // remove the placeholder above

  const batchSize = Math.max(1, Math.floor(RATE / 10)); // send in batches of 1/10th of rate
  const targetInterval = 100; // ms

  const timer = setInterval(async () => {
    if (Date.now() - startTime > DURATION * 1000) {
        clearInterval(timer);
        await producer.disconnect();
        logger.info(`Load Test Complete. Sent ${sent} messages.`);
        return;
    }

    const messages = [];
    for (let i = 0; i < batchSize; i++) {
        messages.push(EventFactory.createEvent('load.test', 'load-generator', {
            seq: sent + i,
            ts: Date.now(),
            payload: 'x'.repeat(100) // 100 bytes padding
        }, `entity-${(sent + i) % 1000}`));
    }

    try {
        await producer.send(TOPIC, messages);
        sent += messages.length;
        if (sent % RATE === 0) {
            logger.info(`Sent ${sent}/${totalMessages}`);
        }
    } catch (e) {
        logger.error('Failed to send batch', e);
    }

  }, targetInterval);

}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
