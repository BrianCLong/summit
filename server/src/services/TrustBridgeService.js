"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trustBridgeService = exports.TrustBridgeService = void 0;
const logger_js_1 = require("../config/logger.js");
const quantum_identity_manager_js_1 = require("../security/quantum-identity-manager.js");
const crypto_1 = require("crypto");
/**
 * Service for Institutional Trust Bridge (Task #120).
 * Provides cryptographically-proven evidence handoff for law enforcement.
 */
class TrustBridgeService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!TrustBridgeService.instance) {
            TrustBridgeService.instance = new TrustBridgeService();
        }
        return TrustBridgeService.instance;
    }
    /**
     * Generates a signed handoff package for an external agency.
     */
    async createHandOff(caseId, evidenceIds, agency) {
        logger_js_1.logger.info({ caseId, agency }, 'TrustBridge: Creating signed evidence handoff');
        const handOffId = (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        // Task #120: Sign the handoff with PQC Identity
        const payload = `handOffId=${handOffId};caseId=${caseId};agency=${agency};items=${evidenceIds.join(',')}`;
        const identity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity(payload);
        return {
            handOffId,
            caseId,
            evidenceItems: evidenceIds,
            recipientAgency: agency,
            pqcAttestation: identity.signature,
            timestamp
        };
    }
    /**
     * Verifies a handoff package received from another Summit node.
     */
    async verifyHandOff(handOff) {
        logger_js_1.logger.info({ handOffId: handOff.handOffId }, 'TrustBridge: Verifying incoming handoff');
        const payload = `handOffId=${handOff.handOffId};caseId=${handOff.caseId};agency=${handOff.recipientAgency};items=${handOff.evidenceItems.join(',')}`;
        return quantum_identity_manager_js_1.quantumIdentityManager.verifyIdentity({
            serviceId: payload,
            publicKey: 'institutional-root-key',
            algorithm: 'KYBER-768',
            issuedAt: handOff.timestamp,
            expiresAt: new Date(Date.now() + 100000).toISOString(),
            signature: handOff.pqcAttestation
        });
    }
}
exports.TrustBridgeService = TrustBridgeService;
exports.trustBridgeService = TrustBridgeService.getInstance();
