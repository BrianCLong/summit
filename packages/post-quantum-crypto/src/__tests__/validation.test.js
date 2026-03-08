"use strict";
/**
 * PQC Validation Utility Tests
 * Tests for correctness validation utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("../utils/validation");
const kyber_1 = require("../algorithms/kyber");
const dilithium_1 = require("../algorithms/dilithium");
describe('PQCValidator', () => {
    let validator;
    beforeEach(() => {
        validator = new validation_1.PQCValidator();
    });
    describe('KEM Validation', () => {
        it('should validate Kyber-512 KEM', async () => {
            const kem = new kyber_1.KyberKEM('kyber512');
            const isValid = await validator.validateKEM(kem, 3);
            expect(isValid).toBe(true);
        });
        it('should validate Kyber-768 KEM', async () => {
            const kem = new kyber_1.KyberKEM('kyber768');
            const isValid = await validator.validateKEM(kem, 3);
            expect(isValid).toBe(true);
        });
        it('should validate Kyber-1024 KEM', async () => {
            const kem = new kyber_1.KyberKEM('kyber1024');
            const isValid = await validator.validateKEM(kem, 3);
            expect(isValid).toBe(true);
        });
    });
    describe('Signature Validation', () => {
        it('should validate Dilithium2 signatures', async () => {
            const dss = new dilithium_1.DilithiumSignature('dilithium2');
            const isValid = await validator.validateSignature(dss, 3);
            expect(isValid).toBe(true);
        });
        it('should validate Dilithium3 signatures', async () => {
            const dss = new dilithium_1.DilithiumSignature('dilithium3');
            const isValid = await validator.validateSignature(dss, 3);
            expect(isValid).toBe(true);
        });
        it('should validate Dilithium5 signatures', async () => {
            const dss = new dilithium_1.DilithiumSignature('dilithium5');
            const isValid = await validator.validateSignature(dss, 3);
            expect(isValid).toBe(true);
        });
    });
    describe('Non-Repudiation Test', () => {
        it('should pass non-repudiation test for Dilithium', async () => {
            const dss = new dilithium_1.DilithiumSignature('dilithium3');
            const passes = await validator.testNonRepudiation(dss);
            expect(passes).toBe(true);
        });
    });
    describe('KEM Uniqueness Test', () => {
        it('should verify each encapsulation produces unique secrets', async () => {
            const kem = new kyber_1.KyberKEM('kyber768');
            const passes = await validator.testKEMUniqueness(kem, 10);
            expect(passes).toBe(true);
        });
    });
    describe('createValidator factory', () => {
        it('should create a validator instance', () => {
            const v = (0, validation_1.createValidator)();
            expect(v).toBeInstanceOf(validation_1.PQCValidator);
        });
    });
});
