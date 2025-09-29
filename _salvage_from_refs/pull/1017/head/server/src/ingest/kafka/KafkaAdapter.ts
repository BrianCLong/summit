export class KafkaAdapter {
  constructor(private brokers: string[], private topicPrefix: string) {}

  async startConsumer(group: string, topic: string, handler: (msg: any) => Promise<void>) {
    await handler({ value: '{}', topic: `${this.topicPrefix}${topic}`, group })
  }
}
