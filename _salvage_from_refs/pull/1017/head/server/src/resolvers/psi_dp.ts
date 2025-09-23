import { OprfPsi } from '../privacy/psi/OprfPsi'
import { runDpJoinAggregate } from '../federation/cleanroom/DpJoinRunner'
import { Accountant } from '../privacy/dp/Accountant'

class MapKV {
  store = new Map<string, any>()
  async get(k: string) { return this.store.get(k) }
  async set(k: string, v: any) { this.store.set(k, v) }
}

const kv = new MapKV()
const psi = new OprfPsi({ get: (k) => kv.get(k), set: (k, v, _ttl) => kv.set(k, v) })
const accountant = new Accountant()

export const resolvers = {
  Mutation: {
    psiStartSession: (_: any, { ttlMs }: { ttlMs?: number }) => psi.startSession(ttlMs),
    dpJoinAggregate: (_: any, args: any) =>
      runDpJoinAggregate({
        tokenRef: args.tokenRef,
        meta: { epsilon: args.epsilon, delta: args.delta, kMin: args.kMin, clip: 1 },
        cohortMin: 25,
        accountant,
        template: args.template
      })
  }
}
