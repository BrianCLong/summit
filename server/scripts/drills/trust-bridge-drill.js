"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TrustBridgeService_js_1 = require("../../src/services/TrustBridgeService.js");
const logger_js_1 = require("../../src/config/logger.js");
/**
 * Task #120: Institutional Trust Bridge Drill.
 * Validates cryptographically-proven evidence handoff to law enforcement.
 */
async function runTrustBridgeDrill() {
    logger_js_1.logger.info('🚀 Starting Institutional Trust Bridge Drill');
    const caseId = 'case-2027-cyber-heist-01';
    const evidenceIds = ['ev-001', 'ev-042', 'ev-099'];
    const agency = 'Interpol-Cyber-Division';
    console.log('--- Step 1: Creating Signed Handoff for Interpol ---');
    const handOff = await TrustBridgeService_js_1.trustBridgeService.createHandOff(caseId, evidenceIds, agency);
    console.log('HandOff ID: ' + handOff.handOffId);
    console.log('PQC Attestation: ' + handOff.pqcAttestation.substring(0, 30));
    if (!handOff.pqcAttestation.startsWith('pqc-sig:')) {
        throw new Error('Handoff failed to generate PQC signature');
    }
    console.log('--- Step 2: Verifying Handoff Integrity ---');
    const isValid = await TrustBridgeService_js_1.trustBridgeService.verifyHandOff(handOff);
    if (isValid) {
        logger_js_1.logger.info('✅ Institutional Trust Bridge Operational');
        process.exit(0);
    }
    else {
        logger_js_1.logger.error('❌ Trust Bridge Verification Failed');
        process.exit(1);
    }
}
runTrustBridgeDrill().catch(err => {
    console.error('❌ Drill Failed:', err);
    process.exit(1);
});
