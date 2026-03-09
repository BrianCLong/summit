import { describe, it, expect } from 'vitest';
import { ArtifactContract } from '../artifact.js';

describe('ArtifactContract', () => {
  const payload = 'test-payload';
  const key = 'secret-key';

  it('should sign and verify successfully', () => {
    const contract = new ArtifactContract(payload, key);
    const signed = contract.sign();

    expect(contract.verify(signed)).toBe(true);
    expect(signed.hash).toBe(contract.contentHash);
  });

  it('should fail verification if hash is tampered', () => {
    const contract = new ArtifactContract(payload, key);
    const signed = contract.sign();
    const tamperedHash = 'f' + signed.hash.slice(1);
    const tamperedSigned = { ...signed, hash: tamperedHash };

    expect(contract.verify(tamperedSigned)).toBe(false);
  });

  it('should fail verification if signature is tampered', () => {
    const contract = new ArtifactContract(payload, key);
    const signed = contract.sign();
    const tamperedSignature = 'f' + signed.signature.slice(1);
    const tamperedSigned = { ...signed, signature: tamperedSignature };

    expect(contract.verify(tamperedSigned)).toBe(false);
  });

  it('should handle serialization roundtrip', () => {
    const contract = new ArtifactContract(payload, key);
    const json = contract.serialize();

    const restored = ArtifactContract.fromJSON(json, key);
    expect(restored.contentHash).toBe(contract.contentHash);
  });

  it('should reject tampered JSON on fromJSON', () => {
    const contract = new ArtifactContract(payload, key);
    const signed = contract.sign();
    const tamperedSigned = { ...signed, signature: 'bad-signature' };
    const tamperedJson = JSON.stringify(tamperedSigned);

    expect(() => ArtifactContract.fromJSON(tamperedJson, key)).toThrow('Invalid artifact signature');
  });
});
