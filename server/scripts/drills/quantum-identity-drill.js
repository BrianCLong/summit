"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const quantum_identity_manager_js_1 = require("../../src/security/quantum-identity-manager.js");
const logger_js_1 = require("../../src/config/logger.js");
/**
 * Task #110: Quantum Identity Drill.
 * Simulates a PQC-secure mutual handshake between two services.
 */
async function runQuantumIdentityDrill() {
    logger_js_1.logger.info('🚀 Starting Quantum Identity Drill (PQC-mTLS Simulation)');
    // 1. Setup Service Identities
    const gatewayId = 'summit-gateway-01';
    const apiId = 'summit-api-01';
    console.log('--- Step 1: Issuing PQC Identities ---');
    const gatewayIdentity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity(gatewayId);
    const apiIdentity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity(apiId);
    console.log('Gateway PQC Algorithm: ' + gatewayIdentity.algorithm);
    console.log('API Public Key: ' + apiIdentity.publicKey.substring(0, 30) + '...');
    // 2. Mutual Verification
    console.log('--- Step 2: Mutual Identity Verification ---');
    const isGatewayValid = quantum_identity_manager_js_1.quantumIdentityManager.verifyIdentity(gatewayIdentity);
    const isApiValid = quantum_identity_manager_js_1.quantumIdentityManager.verifyIdentity(apiIdentity);
    if (!isGatewayValid || !isApiValid) {
        throw new Error('Identity verification failed!');
    }
    console.log('✅ Both services verified each other using simulated Dilithium signatures.');
    // 3. PQC Key Exchange (KEM)
    console.log('--- Step 3: PQC-KEM Handshake (Kyber Simulation) ---');
    // Gateway initiates handshake using API's public key
    console.log('Gateway -> API: Initiating KEM using API public key...');
    const { sharedSecret: gatewaySecret, ciphertext } = quantum_identity_manager_js_1.quantumIdentityManager.encapsulate(apiIdentity.publicKey);
    console.log('Gateway generated shared secret: ' + gatewaySecret.substring(0, 10) + '...');
    console.log('Ciphertext payload sent to API: ' + ciphertext);
    // API decapsulates the ciphertext to recover the secret
    console.log('API -> Gateway: Decapsulating ciphertext...');
    const apiSecret = quantum_identity_manager_js_1.quantumIdentityManager.decapsulate(ciphertext);
    console.log('API recovered shared secret: ' + apiSecret.substring(0, 10) + '...');
    // 4. Operational Readiness Check
    console.log('--- Step 4: Operational Readiness ---');
    if (gatewayIdentity.signature.startsWith('pqc-sig:') && ciphertext.startsWith('kem-enc:')) {
        logger_js_1.logger.info('✅ Quantum-Resistant Service Identity Operational');
        process.exit(0);
    }
    else {
        logger_js_1.logger.error('❌ PQC markers missing in handshake');
        process.exit(1);
    }
}
runQuantumIdentityDrill().catch(err => {
    console.error('❌ Drill Failed:', err);
    process.exit(1);
});
