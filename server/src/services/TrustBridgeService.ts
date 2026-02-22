
import { logger } from '../config/logger.js';
import { quantumIdentityManager } from '../security/quantum-identity-manager.js';
import { randomUUID } from 'crypto';

export interface EvidenceHandOff {
  handOffId: string;
  caseId: string;
  evidenceItems: string[]; // IDs of evidence bundles
  recipientAgency: string;
  pqcAttestation: string;
  timestamp: string;
}

/**
 * Service for Institutional Trust Bridge (Task #120).
 * Provides cryptographically-proven evidence handoff for law enforcement.
 */
export class TrustBridgeService {
  private static instance: TrustBridgeService;

  private constructor() {}

  public static getInstance(): TrustBridgeService {
    if (!TrustBridgeService.instance) {
      TrustBridgeService.instance = new TrustBridgeService();
    }
    return TrustBridgeService.instance;
  }

  /**
   * Generates a signed handoff package for an external agency.
   */
  public async createHandOff(caseId: string, evidenceIds: string[], agency: string): Promise<EvidenceHandOff> {
    logger.info({ caseId, agency }, 'TrustBridge: Creating signed evidence handoff');

    const handOffId = randomUUID();
    const timestamp = new Date().toISOString();

    // Task #120: Sign the handoff with PQC Identity
    const payload = `handOffId=${handOffId};caseId=${caseId};agency=${agency};items=${evidenceIds.join(',')}`;
    const identity = quantumIdentityManager.issueIdentity(payload);

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
  public async verifyHandOff(handOff: EvidenceHandOff): Promise<boolean> {
    logger.info({ handOffId: handOff.handOffId }, 'TrustBridge: Verifying incoming handoff');

    const payload = `handOffId=${handOff.handOffId};caseId=${handOff.caseId};agency=${handOff.recipientAgency};items=${handOff.evidenceItems.join(',')}`;
    
    return quantumIdentityManager.verifyIdentity({
        serviceId: payload,
        publicKey: 'institutional-root-key',
        algorithm: 'KYBER-768',
        issuedAt: handOff.timestamp,
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        signature: handOff.pqcAttestation
    });
  }
}

export const trustBridgeService = TrustBridgeService.getInstance();
