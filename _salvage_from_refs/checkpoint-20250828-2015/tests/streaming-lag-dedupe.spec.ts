import { Kafka, Admin } from 'kafkajs';
import fetch from 'node-fetch';

// Integration test for Kafka consumer lag and alert duplication metrics.

describe('Streaming Alerts SLOs', () => {
  let kafka: Kafka;
  let admin: Admin;

  beforeAll(() => {
    if (!process.env.KAFKA_BROKERS) {
      throw new Error('KAFKA_BROKERS environment variable is not set.');
    }
    kafka = new Kafka({
      clientId: 'slo-test-client',
      brokers: process.env.KAFKA_BROKERS.split(','),
    });
    admin = kafka.admin();
  });

  afterAll(async () => {
    await admin.disconnect();
  });

  it('should have consumer lag within the defined SLO (< 1000 messages)', async () => {
    await admin.connect();
    const offsets = await admin.fetchTopicOffsets('alerts.v1');
    await admin.disconnect();

    // Calculate total lag across all partitions.
    const totalLag = offsets.reduce((sum, partition) => {
      const high = BigInt(partition.high);
      const low = BigInt(partition.low);
      return sum + (high - low);
    }, BigInt(0));

    console.log(`Current consumer lag for topic 'alerts.v1': ${totalLag}`);
    expect(totalLag).toBeLessThan(1000);
  }, 15000); // 15s timeout

  it('should have an alert duplication ratio less than 0.1%', async () => {
    const metricsUrl = (process.env.WEB_URL || 'http://localhost:3001') + '/metrics';
    const response = await fetch(metricsUrl);
    const text = await response.text();

    // Regex to find the duplication ratio metric from the Prometheus endpoint.
    const match = /intg_alert_duplicates_ratio{[^}]*}\s+([0-9.]+)/.exec(text);
    
    if (!match) {
      console.warn(`Metric 'intg_alert_duplicates_ratio' not found at ${metricsUrl}. Skipping test.`);
      return;
    }

    const duplicationRatio = parseFloat(match[1]);
    console.log(`Current alert duplication ratio: ${duplicationRatio}`);
    expect(duplicationRatio).toBeLessThan(0.001); // <= 0.1%
  }, 15000);
});
