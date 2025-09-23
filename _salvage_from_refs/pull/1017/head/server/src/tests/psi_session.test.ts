import { OprfPsi } from '../privacy/psi/OprfPsi'

class KV {
  store = new Map<string, any>()
  async get(k: string) { return this.store.get(k) }
  async set(k: string, v: any, _ttl: number) { this.store.set(k, v) }
}

test('session emits nonce and expires', async () => {
  const kv = new KV()
  const psi = new OprfPsi(kv)
  const sess = await psi.startSession(1000)
  expect(sess.nonce).toHaveLength(32)
})

test('intersect returns cardinality without raw data', async () => {
  const kv = new KV()
  const psi = new OprfPsi(kv)
  const sess = await psi.startSession()
  const res = await psi.intersect(sess.id, ['a', 'b'])
  expect(res.cardinality).toBe(2)
  expect((res as any).raw).toBeUndefined()
})
