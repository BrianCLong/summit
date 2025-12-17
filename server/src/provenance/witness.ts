export interface ProvenanceWitness {
  id: string;
  name: string;
  publicKey?: string;
  sign(data: string): Promise<string>;
  verify(data: string, signature: string): Promise<boolean>;
}

export class CryptoWitness implements ProvenanceWitness {
  id: string;
  name: string;
  private privateKey: string;
  publicKey: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    // Generate ephemeral key pair for demo purposes
    // In production, keys would be loaded from KMS or Vault
    const { privateKey, publicKey } = require('crypto').generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    this.privateKey = privateKey.export({ type: 'pkcs1', format: 'pem' });
    this.publicKey = publicKey.export({ type: 'pkcs1', format: 'pem' });
  }

  async sign(data: string): Promise<string> {
    const sign = require('crypto').createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  async verify(data: string, signature: string): Promise<boolean> {
    const verify = require('crypto').createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(this.publicKey, signature, 'base64');
  }
}

export class WitnessRegistry {
  private witnesses: Map<string, ProvenanceWitness> = new Map();

  register(witness: ProvenanceWitness) {
    this.witnesses.set(witness.id, witness);
  }

  get(id: string): ProvenanceWitness | undefined {
    return this.witnesses.get(id);
  }

  getAll(): ProvenanceWitness[] {
    return Array.from(this.witnesses.values());
  }
}

export const witnessRegistry = new WitnessRegistry();
