import { defineTask } from '@summit/maestro-sdk';
import { Kafka } from 'kafkajs';

interface In { brokers: string[]; topic: string; messages: { key?: string; value: string }[] }
export default defineTask<In, { count: number }> ({
  async execute(_ctx, { payload }){
    const kafka = new Kafka({ clientId: 'maestro', brokers: payload.brokers });
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({ topic: payload.topic, messages: payload.messages });
    await producer.disconnect();
    return { payload: { count: payload.messages.length } };
  }
});
