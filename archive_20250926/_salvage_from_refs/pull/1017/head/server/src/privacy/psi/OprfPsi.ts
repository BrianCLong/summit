import crypto from 'crypto'

export type PsiSession = {
  id: string
  pubKey: string
  nonce: string
  ttlMs: number
  createdAt: number
}

export class OprfPsi {
  constructor(private kv: { get: (k: string) => Promise<any>; set: (k: string, v: any, ttl: number) => Promise<void> }) {}

  async startSession(ttlMs = 30 * 60 * 1000): Promise<PsiSession> {
    const key = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    const nonce = crypto.randomBytes(16).toString('hex')
    const id = crypto.randomUUID()
    const sess: PsiSession = {
      id,
      pubKey: key.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      nonce,
      ttlMs,
      createdAt: Date.now()
    }
    await this.kv.set(
      `psi:${id}`,
      {
        ...sess,
        privKey: key.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
      },
      ttlMs
    )
    return sess
  }

  async intersect(sessionId: string, blindedHandles: string[]): Promise<{ cardinality: number; tokenRef: string }> {
    const tokenRef = `psitok:${sessionId}:${crypto.randomBytes(8).toString('hex')}`
    await this.kv.set(
      tokenRef,
      { sessionId, blindedHandles, createdAt: Date.now() },
      10 * 60 * 1000
    )
    return { cardinality: Math.min(blindedHandles.length, 99999), tokenRef }
  }
}
