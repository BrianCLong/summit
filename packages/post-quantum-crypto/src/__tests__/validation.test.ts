/**
 * PQC Validation Utility Tests
 * Tests for correctness validation utilities
 */

import { PQCValidator, createValidator } from '../utils/validation';
import { KyberKEM } from '../algorithms/kyber';
import { DilithiumSignature } from '../algorithms/dilithium';

describe('PQCValidator', () => {
  let validator: PQCValidator;

  beforeEach(() => {
    validator = new PQCValidator();
  });

  describe('KEM Validation', () => {
    it('should validate Kyber-512 KEM', async () => {
      const kem = new KyberKEM('kyber512');
      const isValid = await validator.validateKEM(kem, 3);
      expect(isValid).toBe(true);
    });

    it('should validate Kyber-768 KEM', async () => {
      const kem = new KyberKEM('kyber768');
      const isValid = await validator.validateKEM(kem, 3);
      expect(isValid).toBe(true);
    });

    it('should validate Kyber-1024 KEM', async () => {
      const kem = new KyberKEM('kyber1024');
      const isValid = await validator.validateKEM(kem, 3);
      expect(isValid).toBe(true);
    });
  });

  describe('Signature Validation', () => {
    it('should validate Dilithium2 signatures', async () => {
      const dss = new DilithiumSignature('dilithium2');
      const isValid = await validator.validateSignature(dss, 3);
      expect(isValid).toBe(true);
    });

    it('should validate Dilithium3 signatures', async () => {
      const dss = new DilithiumSignature('dilithium3');
      const isValid = await validator.validateSignature(dss, 3);
      expect(isValid).toBe(true);
    });

    it('should validate Dilithium5 signatures', async () => {
      const dss = new DilithiumSignature('dilithium5');
      const isValid = await validator.validateSignature(dss, 3);
      expect(isValid).toBe(true);
    });
  });

  describe('Non-Repudiation Test', () => {
    it('should pass non-repudiation test for Dilithium', async () => {
      const dss = new DilithiumSignature('dilithium3');
      const passes = await validator.testNonRepudiation(dss);
      expect(passes).toBe(true);
    });
  });

  describe('KEM Uniqueness Test', () => {
    it('should verify each encapsulation produces unique secrets', async () => {
      const kem = new KyberKEM('kyber768');
      const passes = await validator.testKEMUniqueness(kem, 10);
      expect(passes).toBe(true);
    });
  });

  describe('createValidator factory', () => {
    it('should create a validator instance', () => {
      const v = createValidator();
      expect(v).toBeInstanceOf(PQCValidator);
    });
  });
});
