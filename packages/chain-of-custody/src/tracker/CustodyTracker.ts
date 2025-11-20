/**
 * Chain of Custody Tracker - Evidence tracking for legal compliance
 */

import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import { Transaction, TransactionType } from '@intelgraph/blockchain';

export interface Evidence {
  id: string;
  type: 'document' | 'file' | 'data' | 'physical' | 'digital';
  hash: string;
  description: string;
  collectedBy: string;
  collectedAt: number;
  location: string;
  metadata: Record<string, any>;
  status: 'collected' | 'sealed' | 'transferred' | 'analyzed' | 'archived';
}

export interface CustodyTransfer {
  id: string;
  evidenceId: string;
  fromCustodian: string;
  toCustodian: string;
  timestamp: number;
  reason: string;
  location: string;
  signature: string;
  witnesses: string[];
  blockchainTxId?: string;
}

export interface CustodyChain {
  evidenceId: string;
  transfers: CustodyTransfer[];
  currentCustodian: string;
  sealed: boolean;
  legalHold: boolean;
  integrityVerified: boolean;
}

export interface LegalHold {
  id: string;
  evidenceIds: string[];
  caseNumber: string;
  issuedBy: string;
  issuedAt: number;
  expiresAt?: number;
  reason: string;
  restrictions: string[];
}

export class CustodyTracker {
  private logger: Logger;
  private evidence: Map<string, Evidence> = new Map();
  private chains: Map<string, CustodyChain> = new Map();
  private legalHolds: Map<string, LegalHold> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Collect evidence
   */
  async collectEvidence(evidenceData: Omit<Evidence, 'id' | 'status'>): Promise<Evidence> {
    try {
      const evidence: Evidence = {
        id: uuidv4(),
        ...evidenceData,
        status: 'collected',
      };

      this.evidence.set(evidence.id, evidence);

      // Initialize custody chain
      const chain: CustodyChain = {
        evidenceId: evidence.id,
        transfers: [],
        currentCustodian: evidence.collectedBy,
        sealed: false,
        legalHold: false,
        integrityVerified: true,
      };

      this.chains.set(evidence.id, chain);

      this.logger.info(
        { evidenceId: evidence.id, collectedBy: evidence.collectedBy },
        'Evidence collected'
      );

      return evidence;
    } catch (error) {
      this.logger.error({ error }, 'Failed to collect evidence');
      throw error;
    }
  }

  /**
   * Seal evidence (make immutable)
   */
  async sealEvidence(evidenceId: string, sealedBy: string): Promise<void> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) {
      throw new Error('Evidence not found');
    }

    const chain = this.chains.get(evidenceId);
    if (!chain) {
      throw new Error('Custody chain not found');
    }

    if (chain.sealed) {
      throw new Error('Evidence already sealed');
    }

    evidence.status = 'sealed';
    chain.sealed = true;

    this.logger.info(
      { evidenceId, sealedBy },
      'Evidence sealed'
    );
  }

  /**
   * Transfer custody
   */
  async transferCustody(
    evidenceId: string,
    fromCustodian: string,
    toCustodian: string,
    reason: string,
    location: string,
    witnesses: string[] = []
  ): Promise<CustodyTransfer> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) {
      throw new Error('Evidence not found');
    }

    const chain = this.chains.get(evidenceId);
    if (!chain) {
      throw new Error('Custody chain not found');
    }

    if (chain.currentCustodian !== fromCustodian) {
      throw new Error('Invalid current custodian');
    }

    if (chain.legalHold) {
      throw new Error('Evidence under legal hold - transfer restricted');
    }

    const transfer: CustodyTransfer = {
      id: uuidv4(),
      evidenceId,
      fromCustodian,
      toCustodian,
      timestamp: Date.now(),
      reason,
      location,
      signature: '', // Will be signed
      witnesses,
    };

    chain.transfers.push(transfer);
    chain.currentCustodian = toCustodian;
    evidence.status = 'transferred';

    this.logger.info(
      {
        evidenceId,
        from: fromCustodian,
        to: toCustodian,
        transferId: transfer.id,
      },
      'Custody transferred'
    );

    return transfer;
  }

  /**
   * Place legal hold
   */
  async placeLegalHold(
    evidenceIds: string[],
    caseNumber: string,
    issuedBy: string,
    reason: string,
    restrictions: string[],
    expiresAt?: number
  ): Promise<LegalHold> {
    const hold: LegalHold = {
      id: uuidv4(),
      evidenceIds,
      caseNumber,
      issuedBy,
      issuedAt: Date.now(),
      expiresAt,
      reason,
      restrictions,
    };

    this.legalHolds.set(hold.id, hold);

    // Mark evidence as under legal hold
    for (const evidenceId of evidenceIds) {
      const chain = this.chains.get(evidenceId);
      if (chain) {
        chain.legalHold = true;
      }
    }

    this.logger.info(
      {
        holdId: hold.id,
        caseNumber,
        evidenceCount: evidenceIds.length,
      },
      'Legal hold placed'
    );

    return hold;
  }

  /**
   * Release legal hold
   */
  async releaseLegalHold(holdId: string, releasedBy: string): Promise<void> {
    const hold = this.legalHolds.get(holdId);
    if (!hold) {
      throw new Error('Legal hold not found');
    }

    // Release evidence from hold
    for (const evidenceId of hold.evidenceIds) {
      const chain = this.chains.get(evidenceId);
      if (chain) {
        chain.legalHold = false;
      }
    }

    this.legalHolds.delete(holdId);

    this.logger.info(
      { holdId, releasedBy },
      'Legal hold released'
    );
  }

  /**
   * Verify evidence integrity
   */
  async verifyIntegrity(evidenceId: string, currentHash: string): Promise<boolean> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) {
      throw new Error('Evidence not found');
    }

    const chain = this.chains.get(evidenceId);
    if (!chain) {
      throw new Error('Custody chain not found');
    }

    const isValid = evidence.hash === currentHash;
    chain.integrityVerified = isValid;

    if (!isValid) {
      this.logger.error(
        { evidenceId, expectedHash: evidence.hash, actualHash: currentHash },
        'Evidence integrity verification failed'
      );
    }

    return isValid;
  }

  /**
   * Get custody chain
   */
  getCustodyChain(evidenceId: string): CustodyChain | undefined {
    return this.chains.get(evidenceId);
  }

  /**
   * Get evidence
   */
  getEvidence(evidenceId: string): Evidence | undefined {
    return this.evidence.get(evidenceId);
  }

  /**
   * Get all evidence under legal hold
   */
  getEvidenceUnderHold(caseNumber: string): Evidence[] {
    const evidence: Evidence[] = [];

    for (const hold of this.legalHolds.values()) {
      if (hold.caseNumber === caseNumber) {
        for (const evidenceId of hold.evidenceIds) {
          const ev = this.evidence.get(evidenceId);
          if (ev) {
            evidence.push(ev);
          }
        }
      }
    }

    return evidence;
  }

  /**
   * Detect gaps in custody chain
   */
  detectChainGaps(evidenceId: string): Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const chain = this.chains.get(evidenceId);
    if (!chain) {
      return [{ type: 'missing_chain', description: 'Custody chain not found', severity: 'critical' }];
    }

    const gaps: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [];

    // Check for missing signatures
    const unsignedTransfers = chain.transfers.filter(t => !t.signature);
    if (unsignedTransfers.length > 0) {
      gaps.push({
        type: 'unsigned_transfer',
        description: `${unsignedTransfers.length} transfers missing signatures`,
        severity: 'high',
      });
    }

    // Check for time gaps (>24 hours between transfers)
    for (let i = 1; i < chain.transfers.length; i++) {
      const timeDiff = chain.transfers[i].timestamp - chain.transfers[i - 1].timestamp;
      if (timeDiff > 24 * 60 * 60 * 1000) {
        gaps.push({
          type: 'time_gap',
          description: `${Math.round(timeDiff / (60 * 60 * 1000))} hour gap between transfers`,
          severity: 'medium',
        });
      }
    }

    // Check integrity
    if (!chain.integrityVerified) {
      gaps.push({
        type: 'integrity_failure',
        description: 'Evidence integrity verification failed',
        severity: 'critical',
      });
    }

    return gaps;
  }

  /**
   * Generate court-admissible report
   */
  async generateCourtReport(evidenceId: string): Promise<{
    evidence: Evidence;
    chain: CustodyChain;
    gaps: any[];
    timeline: any[];
    verified: boolean;
  }> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) {
      throw new Error('Evidence not found');
    }

    const chain = this.chains.get(evidenceId);
    if (!chain) {
      throw new Error('Custody chain not found');
    }

    const gaps = this.detectChainGaps(evidenceId);

    // Build timeline
    const timeline = [
      {
        timestamp: evidence.collectedAt,
        event: 'collected',
        actor: evidence.collectedBy,
        location: evidence.location,
      },
      ...chain.transfers.map(t => ({
        timestamp: t.timestamp,
        event: 'transferred',
        from: t.fromCustodian,
        to: t.toCustodian,
        reason: t.reason,
        location: t.location,
        witnesses: t.witnesses,
      })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    return {
      evidence,
      chain,
      gaps,
      timeline,
      verified: gaps.length === 0 && chain.integrityVerified,
    };
  }
}
