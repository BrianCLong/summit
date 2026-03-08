"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const quantum_identity_manager_js_1 = require("../quantum-identity-manager.js");
(0, globals_1.describe)('Quantum Identity Drill (Task #110)', () => {
    (0, globals_1.it)('should issue and verify a valid Quantum Identity', () => {
        const serviceId = 'maestro-core';
        const identity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity(serviceId);
        (0, globals_1.expect)(identity.serviceId).toBe(serviceId);
        (0, globals_1.expect)(identity.algorithm).toBe('KYBER-768');
        (0, globals_1.expect)(identity.signature).toMatch(/^pqc-sig:/);
        const isValid = quantum_identity_manager_js_1.quantumIdentityManager.verifyIdentity(identity);
        (0, globals_1.expect)(isValid).toBe(true);
    });
    (0, globals_1.it)('should reject tampered identities', () => {
        const identity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity('auth-service');
        // Tamper with the public key
        const tamperedIdentity = { ...identity, publicKey: 'pqc-kyber-v1:TAMPERED' };
        const isValid = quantum_identity_manager_js_1.quantumIdentityManager.verifyIdentity(tamperedIdentity);
        (0, globals_1.expect)(isValid).toBe(false);
    });
    (0, globals_1.it)('should simulate KEM encapsulation flow', () => {
        const aliceIdentity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity('alice-service');
        const bobIdentity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity('bob-service');
        // Alice wants to talk to Bob securely
        const { sharedSecret, ciphertext } = quantum_identity_manager_js_1.quantumIdentityManager.encapsulate(bobIdentity.publicKey);
        (0, globals_1.expect)(sharedSecret).toBeDefined();
        (0, globals_1.expect)(ciphertext).toMatch(/^kem-enc:/);
        // Bob decapsulates (simulated)
        const recoveredSecret = quantum_identity_manager_js_1.quantumIdentityManager.decapsulate(ciphertext);
        (0, globals_1.expect)(recoveredSecret).toBeDefined();
    });
});
