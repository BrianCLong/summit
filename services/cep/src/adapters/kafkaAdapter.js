import { Kafka } from 'kafkajs';

export class KafkaAdapter {
  constructor({ brokers, topic }) {
    this.kafka = new Kafka({ brokers });
    this.topic = topic;
    this.producer = this.kafka.producer({ idempotent: true });
    this.started = false;
  }

  async start() {
    if (this.started) return;
    await this.producer.connect();
    this.started = true;
  }

  async emit(payload, { idempotencyKey, labels }) {
    await this.start();
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: idempotencyKey,
          value: JSON.stringify(payload),
          headers: { ...Object.fromEntries(Object.entries(labels || {}).map(([k, v]) => [k, String(v)])), 'lac-label': labels?.lac || '' }
        }
      ]
    });
  }
}
