import crypto from 'node:crypto';
import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  jest,
} from '@jest/globals';
import { ProvenanceLedgerV2 } from '../src/provenance/ledger.js';
import {
  CryptoPipeline,
  InMemoryKeyStore,
} from '../src/security/crypto/index.js';

describe('ProvenanceLedgerV2 crypto integration', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    delete process.env.LEDGER_SIGNING_KEY_ID;
  });

  test('delegates signing and verification to crypto pipeline when configured', async () => {
    const ledger = new ProvenanceLedgerV2();
    const pipeline = new CryptoPipeline({ keyStore: new InMemoryKeyStore() });

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const keyId = 'ledger-root';
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

    process.env.LEDGER_SIGNING_KEY_ID = keyId;
    ledger.setCryptoPipeline(pipeline);

    const rawSignature = await (ledger as any).signWithCosign('root-data');
    expect(rawSignature.trim().startsWith('{')).toBe(true);

    const isValid = await ledger.verifySignature('root-data', rawSignature);
    expect(isValid).toBe(true);
  });
});
