import { UFAR } from './ufar.js';

/**
 * Forked Hypothesis Ledger (FHL)
 */
export interface HypothesisLedger {
  hypotheses: Hypothesis[];
  metadata: {
    investigationId: string;
    updatedAt?: string;
  };
}

export interface Hypothesis {
  hypothesisId: string;
  statement: string;
  status: 'ACTIVE' | 'REJECTED' | 'ACCEPTED' | 'DEFERRED';
  uncertainty?: UFAR['uncertainty'];
  evidenceLinks: EvidenceLink[];
  /** Mandatory if status is REJECTED. */
  rejectionRationale?: string;
  /** Reference to the hypothesis this was forked from. */
  parentHypothesisId?: string;
}

export interface EvidenceLink {
  evidenceId: string;
  relationship: 'SUPPORTING' | 'DISCONFIRMING' | 'NEUTRAL';
}
