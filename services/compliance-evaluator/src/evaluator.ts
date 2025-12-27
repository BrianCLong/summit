import { randomUUID } from 'node:crypto';
import { canonicalJson, sha256Hex } from './hashing.js';
import { OpaClient } from './opaClient.js';
import { AppendOnlyLedger } from './ledger.js';
import { Attestation, EvidenceBase } from './types.js';
import { validateEvidence } from './validators.js';

export class ComplianceEvaluator {
  constructor(
    private readonly opa: OpaClient,
    private readonly ledger: AppendOnlyLedger
  ) {}

  async handleEvidence(evidence: EvidenceBase, nowIso: string): Promise<Attestation> {
    const v = validateEvidence(evidence);
    if (!v.ok) {
      return this.ledger.append({
        attestation_id: randomUUID(),
        control_id: evidence.control_id ?? 'unknown',
        result: 'UNKNOWN',
        evaluated_at: nowIso,
        inputs_hash: sha256Hex(
          canonicalJson({ evidence, now: nowIso, validation_errors: v.errors })
        ),
        evidence_ref: {
          trace_id: evidence.trace_id,
          request_id: evidence.request_id
        },
        reasons: v.errors
      });
    }

    const input = { control_id: evidence.control_id, evidence, now: nowIso };
    const inputs_hash = sha256Hex(canonicalJson(input));

    const decision = await this.opa.evaluate(input);
    const allow = Boolean(decision?.result?.allow);
    const envelope = decision?.result?.decision;

    const result: Attestation['result'] = envelope?.result
      ? envelope.result
      : allow
      ? 'PASS'
      : 'FAIL';

    const reasons = envelope?.reasons ?? [];

    return this.ledger.append({
      attestation_id: randomUUID(),
      control_id: evidence.control_id,
      result,
      evaluated_at: nowIso,
      inputs_hash,
      evidence_ref: {
        trace_id: evidence.trace_id,
        request_id: evidence.request_id
      },
      reasons
    });
  }
}
