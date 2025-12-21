import { Kafka } from 'kafkajs';
import { Claim } from '../types.js';

export class KafkaPublisher {
  private producer: ReturnType<Kafka['producer']> | null = null;
  private topic = 'prov.claim.registered.v1';
  private disabled: boolean;

  constructor() {
    const brokers = process.env.KAFKA_BROKERS;
    this.disabled = !brokers;
    if (brokers) {
      const kafka = new Kafka({ clientId: 'prov-ledger', brokers: brokers.split(',') });
      this.producer = kafka.producer();
    }
  }

  public async emitClaimRegistered(claim: Claim, hash: string, merkleRoot: string): Promise<void> {
    if (this.disabled || !this.producer) {
      return;
    }
    await this.producer.connect();
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: claim.claimId,
          value: JSON.stringify({
            claimId: claim.claimId,
            assertion: claim.assertion,
            confidence: claim.confidence,
            evidenceRefs: claim.evidenceRefs,
            hash,
            merkleRoot,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
    await this.producer.disconnect();
  }
}
