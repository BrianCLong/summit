import { KafkaContainer } from '@testcontainers/kafka';
import { GenericContainer } from 'testcontainers';
import { publish } from '../../src/stream/kafka';
import { createClient } from 'redis';
import { fork } from 'child_process';

jest.setTimeout(120000);

describe('Stream Processor Integration', () => {
  let kafkaContainer: KafkaContainer;
  let redisContainer: GenericContainer;
  let streamProcessorProcess: any;

  beforeAll(async () => {
    kafkaContainer = await new KafkaContainer().start();
    process.env.KAFKA_BROKERS = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`;

    redisContainer = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
    process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}/0`;

    // Start stream processor (assuming it's a Python script that needs to be run)
    // Adjust path if your app.py is compiled or located differently
    streamProcessorProcess = fork('stream_processor/app.py', [], {
      execPath: 'python3', // Ensure python3 is used
      env: { ...process.env, KAFKA_BROKERS: process.env.KAFKA_BROKERS, REDIS_URL: process.env.REDIS_URL },
      silent: true // Suppress child process output unless there's an error
    });

    streamProcessorProcess.stdout.on('data', (data: Buffer) => {
      console.log(`Stream Processor stdout: ${data.toString()}`);
    });
    streamProcessorProcess.stderr.on('data', (data: Buffer) => {
      console.error(`Stream Processor stderr: ${data.toString()}`);
    });

    // Give the stream processor a moment to start up
    await new Promise(resolve => setTimeout(resolve, 5000));
  }, 180000); // Increased timeout for container startup

  afterAll(async () => {
    if (streamProcessorProcess) {
      streamProcessorProcess.kill();
    }
    if (kafkaContainer) {
      await kafkaContainer.stop();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  test('pipes edge event -> feature store update -> redis pub alert', async () => {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();

    const tenantId = 't1';
    const srcNode = 'n1';
    const dstNode = 'n2';
    const edgeRel = 'RELATES';

    // Publish an edge event
    await publish('intelgraph.edges.v1', `${srcNode}->${dstNode}:${edgeRel}`, {
      src: srcNode, dst: dstNode, rel: edgeRel, tenantId: tenantId, weight: 1, ts: new Date().toISOString()
    });

    // Poll feature store for updates
    let tries = 0;
    let srcDegree = 0;
    let dstDegree = 0;
    while (tries < 20) {
      srcDegree = parseInt(await redisClient.hGet(`feat:${tenantId}:${srcNode}`, 'degree') || '0', 10);
      dstDegree = parseInt(await redisClient.hGet(`feat:${tenantId}:${dstNode}`, 'degree') || '0', 10);
      if (srcDegree > 0 && dstDegree > 0) break;
      await new Promise(resolve => setTimeout(resolve, 500));
      tries++;
    }

    expect(srcDegree).toBeGreaterThan(0);
    expect(dstDegree).toBeGreaterThan(0);

    // Optionally, listen for the alert on Redis pub/sub if needed for a more complete test
    // For this test, we're primarily checking feature store update

    await redisClient.disconnect();
  }, 60000); // Increased timeout for test execution

  test('should handle high volume of events and throttle if necessary', async () => {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();

    const tenantId = 't1';
    const numEvents = 1000; // Number of events to simulate
    const publishPromises = [];

    console.log(`Publishing ${numEvents} events...`);
    for (let i = 0; i < numEvents; i++) {
      const srcNode = `n_high_load_${i}`;
      const dstNode = `n_high_load_${i + 1}`;
      const edgeRel = 'HIGH_LOAD_REL';
      publishPromises.push(
        publish('intelgraph.edges.v1', `${srcNode}->${dstNode}:${edgeRel}`, {
          src: srcNode, dst: dstNode, rel: edgeRel, tenantId: tenantId, weight: 1, ts: new Date().toISOString()
        })
      );
    }
    await Promise.all(publishPromises);
    console.log(`${numEvents} events published.`);

    // Give stream processor time to process
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds

    // Check if features were updated (some degree of processing occurred)
    let processedCount = 0;
    for (let i = 0; i < numEvents; i++) {
      const node = `n_high_load_${i}`;
      const degree = parseInt(await redisClient.hGet(`feat:${tenantId}:${node}`, 'degree') || '0', 10);
      if (degree > 0) {
        processedCount++;
      }
    }
    console.log(`Processed ${processedCount} out of ${numEvents} events.`);

    // Assert that a significant portion of events were processed, but not necessarily all if throttling occurred
    expect(processedCount).toBeGreaterThan(numEvents * 0.5); // Expect at least 50% to be processed
    // Further assertions could check for specific throttling metrics if exposed by the stream processor
    // For example, checking a counter for dropped messages or a gauge for queue size.

    await redisClient.disconnect();
  }, 120000); // Increased timeout for high volume test
});
