"use strict";
/**
 * PQC Validation and Testing Utilities
 * Ensures correctness of post-quantum cryptographic implementations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PQCValidator = void 0;
exports.createValidator = createValidator;
class PQCValidator {
    /**
     * Validate KEM correctness
     * Ensures encapsulate/decapsulate produces same shared secret
     */
    async validateKEM(kem, iterations = 10) {
        for (let i = 0; i < iterations; i++) {
            try {
                // Generate key pair
                const keyPair = await kem.generateKeyPair();
                // Encapsulate
                const { ciphertext, sharedSecret: encapsulatedSecret } = await kem.encapsulate(keyPair.publicKey);
                // Decapsulate
                const decapsulatedSecret = await kem.decapsulate(ciphertext, keyPair.privateKey);
                // Verify secrets match
                if (!this.compareUint8Arrays(encapsulatedSecret, decapsulatedSecret)) {
                    console.error(`KEM validation failed on iteration ${i + 1}: secrets don't match`);
                    return false;
                }
            }
            catch (error) {
                console.error(`KEM validation failed on iteration ${i + 1}:`, error);
                return false;
            }
        }
        return true;
    }
    /**
     * Validate digital signature scheme correctness
     * Ensures sign/verify works correctly
     */
    async validateSignature(dss, iterations = 10) {
        for (let i = 0; i < iterations; i++) {
            try {
                // Generate key pair
                const keyPair = await dss.generateKeyPair();
                // Create test message
                const message = crypto.getRandomValues(new Uint8Array(256));
                // Sign message
                const { signature } = await dss.sign(message, keyPair.privateKey);
                // Verify signature
                const isValid = await dss.verify(message, signature, keyPair.publicKey);
                if (!isValid) {
                    console.error(`Signature validation failed on iteration ${i + 1}: signature invalid`);
                    return false;
                }
                // Test with wrong message
                const wrongMessage = crypto.getRandomValues(new Uint8Array(256));
                const isInvalid = await dss.verify(wrongMessage, signature, keyPair.publicKey);
                if (isInvalid) {
                    console.error(`Signature validation failed on iteration ${i + 1}: accepted invalid signature`);
                    return false;
                }
            }
            catch (error) {
                console.error(`Signature validation failed on iteration ${i + 1}:`, error);
                return false;
            }
        }
        return true;
    }
    /**
     * Test signature non-repudiation
     * Ensures signatures can't be forged
     */
    async testNonRepudiation(dss) {
        try {
            const keyPair = await dss.generateKeyPair();
            const message = crypto.getRandomValues(new Uint8Array(256));
            // Sign with correct key
            const { signature } = await dss.sign(message, keyPair.privateKey);
            // Generate different key pair
            const otherKeyPair = await dss.generateKeyPair();
            // Verify with wrong public key should fail
            const isValid = await dss.verify(message, signature, otherKeyPair.publicKey);
            if (isValid) {
                console.error('Non-repudiation test failed: signature verified with wrong public key');
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Non-repudiation test failed:', error);
            return false;
        }
    }
    /**
     * Test KEM shared secret uniqueness
     * Ensures each encapsulation produces unique secrets
     */
    async testKEMUniqueness(kem, iterations = 100) {
        try {
            const keyPair = await kem.generateKeyPair();
            const secrets = new Set();
            for (let i = 0; i < iterations; i++) {
                const { sharedSecret } = await kem.encapsulate(keyPair.publicKey);
                const secretHex = this.uint8ArrayToHex(sharedSecret);
                if (secrets.has(secretHex)) {
                    console.error(`KEM uniqueness test failed: duplicate secret found at iteration ${i + 1}`);
                    return false;
                }
                secrets.add(secretHex);
            }
            return true;
        }
        catch (error) {
            console.error('KEM uniqueness test failed:', error);
            return false;
        }
    }
    compareUint8Arrays(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    uint8ArrayToHex(arr) {
        return Array.from(arr)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}
exports.PQCValidator = PQCValidator;
function createValidator() {
    return new PQCValidator();
}
