import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import pino from 'pino';
import type { TwinEvent } from '../types/index.js';

const logger = pino({ name: 'EventBus' });

export class EventBus {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private eventSubject = new Subject<TwinEvent>();
  private topic = 'digital-twin-events';
  private connected = false;

  constructor(kafkaBrokers: string[], clientId: string) {
    this.kafka = new Kafka({
      clientId,
      brokers: kafkaBrokers,
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: `${clientId}-group` });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (message.value) {
          const event = JSON.parse(message.value.toString()) as TwinEvent;
          this.eventSubject.next(event);
        }
      },
    });

    this.connected = true;
    logger.info('EventBus connected to Kafka');
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    this.connected = false;
  }

  async publish(event: TwinEvent): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: event.twinId,
          value: JSON.stringify(event),
          headers: {
            eventType: event.type,
            timestamp: event.timestamp.toISOString(),
          },
        },
      ],
    });
    logger.debug({ eventId: event.id, twinId: event.twinId }, 'Event published');
  }

  subscribe(twinId?: string): Observable<TwinEvent> {
    if (twinId) {
      return this.eventSubject.pipe(filter((e) => e.twinId === twinId));
    }
    return this.eventSubject.asObservable();
  }

  subscribeByType(eventType: TwinEvent['type']): Observable<TwinEvent> {
    return this.eventSubject.pipe(filter((e) => e.type === eventType));
  }
}
