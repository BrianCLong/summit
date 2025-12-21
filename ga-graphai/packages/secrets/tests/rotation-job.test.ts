import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AwsKmsEnvelopeProvider,
  KeyRotationJob,
  ZeroTrustSecretsManager,
  buildEnvelopeCiphertext,
  enforceNoPlaintext,
  type DualReadPointer,
} from '../src/index.js';
import type { SecretRef } from '../src/types.js';

describe('KeyRotationJob', () => {
  it('maintains dual-read capability during rotation and supports rollback', async () => {
    const dataKey = randomBytes(32);
    const ciphertext = buildEnvelopeCiphertext(
      Buffer.from('encrypted-key'),
      dataKey,
      'payload-secret',
    );
    const manager = new ZeroTrustSecretsManager([
      new AwsKmsEnvelopeProvider({
        decrypt: async () => ({ Plaintext: dataKey }),
        generateDataKey: async () => ({
          CiphertextBlob: Buffer.from('new-key'),
          Plaintext: randomBytes(32),
        }),
      }),
    ]);

    const pointer: DualReadPointer = {
      active: { provider: 'kms', key: 'db/password', keyId: 'alias/db', ciphertext } as SecretRef,
    };
    const job = new KeyRotationJob(manager);

    const initial = await job.decrypt(pointer);
    expect(initial.value).toBe('payload-secret');

    const rotated = await job.rotate(pointer);
    const duringWindow = await job.decrypt(rotated.pointer);
    expect(duringWindow.value).toBe('payload-secret');

    const rolledBack = job.rollback(rotated.pointer);
    expect(await job.decrypt(rolledBack)).toStrictEqual(initial);
    expect(rotated.audit.action).toBe('key.rotated');
  });
});

describe('secret scanning', () => {
  it('blocks plaintext secrets', () => {
    expect(() =>
      enforceNoPlaintext({
        config: 'AKIAAAAAAAAAAAAAAAA',
        safe: 'non secret value',
      }),
    ).toThrowError(/Secret scanning failed/);
  });
});
