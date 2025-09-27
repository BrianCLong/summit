import crypto from 'crypto';

interface Store {
  get(): Promise<any>;
  set(jwks: any): Promise<void>;
}

export class JwksRotator {
  constructor(private store: Store) {}

  async rotateIfDue(now = Date.now()) {
    const jwks = await this.store.get();
    if (jwks && now - jwks.generatedAt > 20 * 3600 * 1000) {
      console.warn('jwks_drift');
    }
    if (!jwks || now - jwks.generatedAt > 24 * 3600 * 1000) {
      const key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pub = key.publicKey.export({ type: 'spki', format: 'pem' });
      const priv = key.privateKey.export({ type: 'pkcs8', format: 'pem' });
      const next = { kid: crypto.randomUUID(), pub, priv, generatedAt: now };
      await this.store.set(next);
      return next;
    }
    return jwks;
  }
}
