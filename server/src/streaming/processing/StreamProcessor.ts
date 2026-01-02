import { KafkaConsumerWrapper } from '../KafkaConsumer.js';
import { KafkaProducerWrapper } from '../KafkaProducer.js';
import { Logger } from '../Logger.js';

export abstract class StreamProcessor {
  protected consumer: KafkaConsumerWrapper;
  protected producer: KafkaProducerWrapper;
  protected logger: Logger;
  protected sourceTopic: string;
  protected destTopic: string;

  constructor(
    consumer: KafkaConsumerWrapper,
    producer: KafkaProducerWrapper,
    sourceTopic: string,
    destTopic: string,
    name: string
  ) {
    this.consumer = consumer;
    this.producer = producer;
    this.sourceTopic = sourceTopic;
    this.destTopic = destTopic;
    this.logger = new Logger(`StreamProcessor-${name}`);
  }

  async start(): Promise<void> {
    this.logger.info(`Starting processor from ${this.sourceTopic} to ${this.destTopic}`);
    await this.consumer.run(async (message: any) => {
      try {
        const result = await this.process(message);
        if (result) {
          await this.producer.send(this.destTopic, [result]);
        }
      } catch (error: any) {
        this.logger.error('Error processing message', error);
        throw error;
      }
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
    await this.producer.disconnect();
    this.logger.info('Stopped processor');
  }

  protected abstract process(message: any): Promise<any | null>;
}
