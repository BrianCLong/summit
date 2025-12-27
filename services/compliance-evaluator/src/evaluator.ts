import { randomUUID } from 'node:crypto';
import type { OpaClient, OpaDecision } from './opaClient.js';
import type { AppendOnlyLedger } from './ledger.js';
import type { EvidenceBase, Attestation, AttestationResult } from './types.js';
import { sha256Hex, canonicalJson } from './hashing.js';

export class ComplianceEvaluator {
  constructor(
    private readonly opa: OpaClient,
    private readonly ledger: AppendOnlyLedger
  ) {}

  async handleEvidence(
    evidence: EvidenceBase,
    nowIso: string
  ): Promise<Attestation> {
    const inputsHash = sha256Hex(canonicalJson(evidence));

    const opaInput = {
      evidence,
      now: nowIso
    };

    let result: AttestationResult = 'UNKNOWN';
    let reasons: string[] = [];

    try {
      const decision: OpaDecision = await this.opa.evaluate(opaInput);
      if (decision.result?.allow === true) {
        result = 'PASS';
      } else if (decision.result?.allow === false) {
        result = 'FAIL';
      }
      if (decision.result?.decision) {
        result = decision.result.decision.result;
        reasons = decision.result.decision.reasons || [];
      }
    } catch (err) {
      result = 'UNKNOWN';
      reasons = [(err as Error).message];
    }

    const attestation = this.ledger.append({
      attestation_id: randomUUID(),
      control_id: evidence.control_id,
      result,
      evaluated_at: nowIso,
      inputs_hash: inputsHash,
      evidence_ref: {
        trace_id: evidence.trace_id,
        request_id: evidence.request_id
      },
      reasons
    });

    return attestation;
  }
}
