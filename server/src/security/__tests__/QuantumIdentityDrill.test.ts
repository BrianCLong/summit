
import { describe, it, expect } from '@jest/globals';
import { quantumIdentityManager } from '../quantum-identity-manager.js';

describe('Quantum Identity Drill (Task #110)', () => {
  it('should issue and verify a valid Quantum Identity', () => {
    const serviceId = 'maestro-core';
    const identity = quantumIdentityManager.issueIdentity(serviceId);

    expect(identity.serviceId).toBe(serviceId);
    expect(identity.algorithm).toBe('KYBER-768');
    expect(identity.signature).toMatch(/^pqc-sig:/);

    const isValid = quantumIdentityManager.verifyIdentity(identity);
    expect(isValid).toBe(true);
  });

  it('should reject tampered identities', () => {
    const identity = quantumIdentityManager.issueIdentity('auth-service');
    
    // Tamper with the public key
    const tamperedIdentity = { ...identity, publicKey: 'pqc-kyber-v1:TAMPERED' };
    
    const isValid = quantumIdentityManager.verifyIdentity(tamperedIdentity);
    expect(isValid).toBe(false);
  });

  it('should simulate KEM encapsulation flow', () => {
    const aliceIdentity = quantumIdentityManager.issueIdentity('alice-service');
    const bobIdentity = quantumIdentityManager.issueIdentity('bob-service');

    // Alice wants to talk to Bob securely
    const { sharedSecret, ciphertext } = quantumIdentityManager.encapsulate(bobIdentity.publicKey);

    expect(sharedSecret).toBeDefined();
    expect(ciphertext).toMatch(/^kem-enc:/);

    // Bob decapsulates (simulated)
    const recoveredSecret = quantumIdentityManager.decapsulate(ciphertext);
    expect(recoveredSecret).toBeDefined();
  });
});
