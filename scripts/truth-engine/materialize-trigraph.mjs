import crypto from 'node:crypto';

function compareWriteSets(a, b) {
  return (
    new Date(a.system_time).getTime() - new Date(b.system_time).getTime() ||
    String(a.writeset_id).localeCompare(String(b.writeset_id))
  );
}

function isKnownAt(writeset, asKnownAt) {
  if (!asKnownAt) {
    return true;
  }
  return new Date(writeset.system_time).getTime() <= new Date(asKnownAt).getTime();
}

function isValidAsOf(claim, asOf) {
  if (!asOf) {
    return true;
  }

  const t = new Date(asOf).getTime();
  const validFrom = new Date(claim.time.valid_from).getTime();
  const validTo = claim.time.valid_to ? new Date(claim.time.valid_to).getTime() : Number.POSITIVE_INFINITY;

  return t >= validFrom && t <= validTo;
}

function claimKey(claim) {
  return claim.claim_id;
}

export function evaluatePromotion({ claim, minEvidenceCount = 2 }) {
  if (!claim) {
    return {
      decision: 'DENY',
      reason: 'PROMOTION_CLAIM_NOT_FOUND'
    };
  }

  if ((claim.evidence_ids || []).length < minEvidenceCount) {
    return {
      decision: 'QUARANTINE',
      reason: 'PROMOTION_INSUFFICIENT_EVIDENCE'
    };
  }

  return {
    decision: 'ALLOW',
    reason: 'PROMOTION_RULES_SATISFIED'
  };
}

export function materializeTriGraph(writeSets, options = {}) {
  const { asKnownAt, asOf, minEvidenceCount = 2 } = options;
  const sorted = [...writeSets].sort(compareWriteSets);

  const ng = new Map();
  const bg = new Map();
  const rg = new Map();
  const audit = [];

  for (const writeset of sorted) {
    if (!isKnownAt(writeset, asKnownAt)) {
      continue;
    }

    for (const op of writeset.ops) {
      if (op.op === 'UPSERT_CLAIM') {
        if (!isValidAsOf(op.claim, asOf)) {
          continue;
        }

        if (op.graph === 'NG') {
          ng.set(claimKey(op.claim), op.claim);
        } else if (op.graph === 'BG') {
          bg.set(claimKey(op.claim), op.claim);
        } else if (op.graph === 'RG') {
          rg.set(claimKey(op.claim), op.claim);
        }
      }

      if (op.op === 'PROPOSE_PROMOTION') {
        const sourceGraph = op.promotion.from_graph === 'NG' ? ng : bg;
        const candidate = sourceGraph.get(op.promotion.claim_id);
        const result = evaluatePromotion({ claim: candidate, minEvidenceCount });

        audit.push({
          writeset_id: writeset.writeset_id,
          promotion_id: op.promotion.promotion_id,
          claim_id: op.promotion.claim_id,
          from_graph: op.promotion.from_graph,
          to_graph: op.promotion.to_graph,
          decision: result.decision,
          reason: result.reason
        });

        if (result.decision === 'ALLOW' && candidate && isValidAsOf(candidate, asOf)) {
          rg.set(claimKey(candidate), candidate);
        }
      }
    }
  }

  const snapshot = {
    ng: [...ng.values()],
    bg: [...bg.values()],
    rg: [...rg.values()],
    audit
  };

  const snapshotHash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

  return {
    ...snapshot,
    snapshotHash
  };
}
