import crypto from 'crypto';

export interface SigningMaterial {
  publicKey: string;
  privateKey: string;
}

const DEFAULT_SEED = process.env.LEDGER_SIGNING_SEED || 'prov-ledger-dev-seed';

function deriveKeyPair(seed: string): SigningMaterial {
  const seedBytes = crypto.createHash('sha256').update(seed).digest();
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    seed: seedBytes,
  });

  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

export class Ed25519Signer {
  private readonly keyPair: SigningMaterial;

  constructor(seed: string = DEFAULT_SEED) {
    this.keyPair = deriveKeyPair(seed);
  }

  sign(hash: string): string {
    const signature = crypto.sign(null, Buffer.from(hash, 'hex'), this.keyPair.privateKey);
    return signature.toString('base64');
  }

  verify(hash: string, signature: string, publicKey?: string): boolean {
    const key = publicKey || this.keyPair.publicKey;
    return crypto.verify(null, Buffer.from(hash, 'hex'), key, Buffer.from(signature, 'base64'));
  }

  getPublicKey(): string {
    return this.keyPair.publicKey;
  }
}

export const defaultSigner = new Ed25519Signer();
