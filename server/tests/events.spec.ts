import { startKafkaSource } from '../src/conductor/events/engine.js';

test('startKafkaSource throws without kafkajs', async () => {
  await expect(
    startKafkaSource({ id: 1, topic: 't', group: 'g', runbook: 'rb' } as any),
  ).rejects.toBeTruthy();
});
