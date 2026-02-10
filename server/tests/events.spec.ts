import { startKafkaSource } from '../src/conductor/events/engine';

test('startKafkaSource throws without kafkajs', async () => {
  await expect(
    startKafkaSource({ id: 1, topic: 't', group: 'g', runbook: 'rb' } as any),
  ).rejects.toBeTruthy();
});
