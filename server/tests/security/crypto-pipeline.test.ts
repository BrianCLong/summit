import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  CryptoPipeline,
  InMemoryKeyStore,
  type KeyVersion,
} from '../src/security/crypto/index.js';

type AlgorithmCase = {
  algorithm: KeyVersion['algorithm'];
  generate: () => { publicKeyPem: string; privateKeyPem: string };
};

const fixturesDir = path.resolve(__dirname, '../fixtures/crypto');
const ROOT_CERT = fs.readFileSync(path.join(fixturesDir, 'root.pem'), 'utf-8');
const INTERMEDIATE_CERT = fs.readFileSync(
  path.join(fixturesDir, 'intermediate.pem'),
  'utf-8',
);
const LEAF_CERT = fs.readFileSync(path.join(fixturesDir, 'leaf.pem'), 'utf-8');
const LEAF_KEY = fs.readFileSync(path.join(fixturesDir, 'leaf.key'), 'utf-8');

class MemoryTimestampingService {
  private readonly tokens = new Map<string, string>();

  async getTimestampToken(payload: Buffer): Promise<string> {
    const digest = crypto.createHash('sha256').update(payload).digest('base64');
    this.tokens.set(digest, payload.toString('base64'));
    return digest;
  }

  async verify(payload: Buffer, token: string): Promise<boolean> {
    return this.tokens.get(token) === payload.toString('base64');
  }
}

describe('CryptoPipeline', () => {
  const algorithms: AlgorithmCase[] = [
    {
      algorithm: 'RSA_SHA256',
      generate: () => {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
        });
        return {
          publicKeyPem: publicKey
            .export({ type: 'spki', format: 'pem' })
            .toString(),
          privateKeyPem: privateKey
            .export({ type: 'pkcs1', format: 'pem' })
            .toString(),
        };
      },
    },
    {
      algorithm: 'ECDSA_P256_SHA256',
      generate: () => {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
          namedCurve: 'P-256',
        });
        return {
          publicKeyPem: publicKey
            .export({ type: 'spki', format: 'pem' })
            .toString(),
          privateKeyPem: privateKey
            .export({ type: 'pkcs8', format: 'pem' })
            .toString(),
        };
      },
    },
    {
      algorithm: 'ECDSA_P384_SHA384',
      generate: () => {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp384r1',
        });
        return {
          publicKeyPem: publicKey
            .export({ type: 'spki', format: 'pem' })
            .toString(),
          privateKeyPem: privateKey
            .export({ type: 'pkcs8', format: 'pem' })
            .toString(),
        };
      },
    },
    {
      algorithm: 'EdDSA_ED25519',
      generate: () => {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        return {
          publicKeyPem: publicKey
            .export({ type: 'spki', format: 'pem' })
            .toString(),
          privateKeyPem: privateKey
            .export({ type: 'pkcs8', format: 'pem' })
            .toString(),
        };
      },
    },
  ];

  test.each(algorithms)(
    'signs and verifies payload using %s',
    async ({ algorithm, generate }) => {
      const pipeline = new CryptoPipeline({ keyStore: new InMemoryKeyStore() });
      const material = generate();
      const key: KeyVersion = {
        id: `key-${algorithm}`,
        version: 1,
        algorithm,
        publicKeyPem: material.publicKeyPem,
        privateKeyPem: material.privateKeyPem,
        createdAt: new Date(),
        validFrom: new Date(),
        isActive: true,
      };
      await pipeline.registerKeyVersion(key);

      const bundle = await pipeline.signPayload('hello world', key.id);
      const result = await pipeline.verifySignature('hello world', bundle, {
        expectedAlgorithm: algorithm,
        expectedKeyId: key.id,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    },
  );

  test('supports key rotation and legacy signature validation', async () => {
    const pipeline = new CryptoPipeline({ keyStore: new InMemoryKeyStore() });
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const keyId = 'rotate-test';

    await pipeline.registerKeyVersion({
      id: keyId,
      version: 1,
      algorithm: 'EdDSA_ED25519',
      publicKeyPem: publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString(),
      privateKeyPem: privateKey
        .export({ type: 'pkcs8', format: 'pem' })
        .toString(),
      createdAt: new Date(),
      validFrom: new Date(),
      isActive: true,
    });

    const bundleV1 = await pipeline.signPayload('payload', keyId);

    const newMaterial = crypto.generateKeyPairSync('ed25519');
    await pipeline.rotateKey(keyId, {
      algorithm: 'EdDSA_ED25519',
      publicKeyPem: newMaterial.publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString(),
      privateKeyPem: newMaterial.privateKey
        .export({ type: 'pkcs8', format: 'pem' })
        .toString(),
      createdAt: new Date(),
      validFrom: new Date(),
      metadata: { rotated: true },
    });

    const bundleV2 = await pipeline.signPayload('payload', keyId);

    expect(bundleV1.keyVersion).toBe(1);
    expect(bundleV2.keyVersion).toBe(2);

    const verifyOld = await pipeline.verifySignature('payload', bundleV1, {
      expectedKeyId: keyId,
    });
    const verifyNew = await pipeline.verifySignature('payload', bundleV2, {
      expectedKeyId: keyId,
    });

    expect(verifyOld.valid).toBe(true);
    expect(verifyNew.valid).toBe(true);
  });

  test('validates certificate chains against trust anchors', async () => {
    const pipeline = new CryptoPipeline({
      keyStore: new InMemoryKeyStore(),
      trustAnchors: [ROOT_CERT],
    });

    await pipeline.registerKeyVersion({
      id: 'cert-chain',
      version: 1,
      algorithm: 'ECDSA_P256_SHA256',
      publicKeyPem: crypto
        .createPublicKey(LEAF_KEY)
        .export({ type: 'spki', format: 'pem' })
        .toString(),
      privateKeyPem: LEAF_KEY,
      certificateChain: [LEAF_CERT, INTERMEDIATE_CERT, ROOT_CERT],
      createdAt: new Date(),
      validFrom: new Date(),
      isActive: true,
    });

    const bundle = await pipeline.signPayload('chain payload', 'cert-chain');
    const result = await pipeline.verifySignature('chain payload', bundle, {
      expectedKeyId: 'cert-chain',
    });

    expect(result.valid).toBe(true);
    expect(result.chainValidated).toBe(true);
  });

  test('emits timestamp tokens and verifies them', async () => {
    const pipeline = new CryptoPipeline({
      keyStore: new InMemoryKeyStore(),
      timestampingService: new MemoryTimestampingService() as any,
    });

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    await pipeline.registerKeyVersion({
      id: 'ts-key',
      version: 1,
      algorithm: 'EdDSA_ED25519',
      publicKeyPem: publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString(),
      privateKeyPem: privateKey
        .export({ type: 'pkcs8', format: 'pem' })
        .toString(),
      createdAt: new Date(),
      validFrom: new Date(),
      isActive: true,
    });

    const bundle = await pipeline.signPayload('timestamped', 'ts-key', {
      includeTimestamp: true,
    });
    expect(bundle.timestampToken).toBeDefined();

    const result = await pipeline.verifySignature('timestamped', bundle, {
      expectedKeyId: 'ts-key',
    });
    expect(result.valid).toBe(true);
    expect(result.timestampVerified).toBe(true);
  });
});
