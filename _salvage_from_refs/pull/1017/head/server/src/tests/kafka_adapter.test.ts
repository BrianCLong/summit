import { KafkaAdapter } from '../ingest/kafka/KafkaAdapter'

test('invokes handler with topic prefix', async () => {
  const adapter = new KafkaAdapter(['b1'], 'tenant-')
  let called = false
  await adapter.startConsumer('g', 'events', async (msg) => {
    called = true
    expect(msg.topic).toBe('tenant-events')
  })
  expect(called).toBe(true)
})
