/**
 * Streaming Service
 * Main microservice for real-time stream processing
 */

import express from 'express';
import { MessageBroker, StreamProducer, StreamConsumer, type BrokerConfig, type ProducerConfig, type ConsumerConfig, type TopicConfig } from '@intelgraph/stream-processing';
import { HttpCollector, WebSocketCollector, CollectorManager, type CollectorConfig } from '@intelgraph/stream-ingestion';
import { CEPEngine, EventEnricher, EventTransformer, EventFilter, type Event } from '@intelgraph/event-processing';

const app = express();
app.use(express.json());

// Configuration
const BROKER_CONFIG: BrokerConfig = {
  brokerId: 0,
  host: process.env.BROKER_HOST || 'localhost',
  port: parseInt(process.env.BROKER_PORT || '9092'),
  dataDir: process.env.DATA_DIR || '/tmp/stream-data',
  logDirs: [process.env.LOG_DIR || '/tmp/stream-logs'],
  autoCreateTopics: true,
  defaultReplicationFactor: 2,
  numPartitions: 3,
};

// Initialize components
const broker = new MessageBroker(BROKER_CONFIG);
const cepEngine = new CEPEngine();
const enricher = new EventEnricher();
const transformer = new EventTransformer();
const filter = new EventFilter();
const collectorManager = new CollectorManager();

/**
 * API Routes
 */

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'streaming-service',
    version: '1.0.0',
    brokerId: broker.getBrokerId(),
    isLeader: broker.isLeaderBroker(),
  });
});

// Create topic
app.post('/api/topics', async (req, res) => {
  try {
    const topicConfig: TopicConfig = req.body;
    await broker.createTopic(topicConfig);
    res.json({ status: 'created', topic: topicConfig.name });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// List topics
app.get('/api/topics', async (req, res) => {
  try {
    // In a real implementation, get from topic manager
    res.json({ topics: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Produce message
app.post('/api/produce', async (req, res) => {
  try {
    const { topic, key, value, headers } = req.body;

    const result = await broker.produce({
      topic,
      key,
      value,
      headers,
      timestamp: Date.now(),
    });

    res.json({ status: 'produced', result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Consume messages
app.get('/api/consume/:topic/:partition', async (req, res) => {
  try {
    const { topic, partition } = req.params;
    const offset = parseInt(req.query.offset as string) || 0;
    const maxMessages = parseInt(req.query.max as string) || 100;

    const messages = await broker.consume(
      topic,
      parseInt(partition),
      offset,
      maxMessages
    );

    res.json({ messages, count: messages.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get metrics
app.get('/api/metrics', (req, res) => {
  const metrics = broker.getMetrics();
  res.json(metrics);
});

// Register CEP pattern
app.post('/api/cep/patterns', (req, res) => {
  try {
    const pattern = req.body;
    cepEngine.registerPattern(pattern);
    res.json({ status: 'registered', pattern: pattern.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Register enrichment rule
app.post('/api/enrichment/rules', (req, res) => {
  try {
    const rule = req.body;
    enricher.registerEnrichmentRule(rule);
    res.json({ status: 'registered', rule: rule.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Register collector
app.post('/api/collectors', async (req, res) => {
  try {
    const config: CollectorConfig = req.body;

    let collector;
    switch (config.type) {
      case 'http':
        collector = new HttpCollector(config);
        break;
      case 'websocket':
        collector = new WebSocketCollector(config);
        break;
      default:
        throw new Error(`Unsupported collector type: ${config.type}`);
    }

    collectorManager.registerCollector(collector);
    res.json({ status: 'registered', collector: config.name });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  try {
    // Start message broker
    await broker.start();

    // Setup event listeners
    broker.on('message:produced', (data) => {
      console.log('Message produced:', data);
    });

    cepEngine.on('pattern:matched', (data) => {
      console.log('Pattern matched:', data.pattern.name);
    });

    cepEngine.on('alert:generated', (alert) => {
      console.log('Alert generated:', alert.title);
    });

    enricher.on('event:enriched', (event) => {
      // Process enriched event
    });

    const PORT = parseInt(process.env.PORT || '3000');
    app.listen(PORT, () => {
      console.log(`Streaming service running on port ${PORT}`);
      console.log(`Broker ID: ${broker.getBrokerId()}`);
      console.log(`Is Leader: ${broker.isLeaderBroker()}`);
    });
  } catch (error) {
    console.error('Failed to start streaming service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down streaming service...');
  await broker.stop();
  process.exit(0);
});

// Start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, broker, cepEngine, enricher, transformer, filter };
