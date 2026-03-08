import { validators } from '@intelgraph/summit-schemas';
import type { CogBattleStorage } from '../storage';
import type { CogRejectionError, CogRejectionItem, CogRejectionReport, CogWriteOp, CogWriteSet } from './types';

function ajvErrorsToItems(prefixCode: string, errors: unknown[] | null | undefined): CogRejectionError[] {
  return (errors ?? []).map((error: any) => ({
    code: prefixCode,
    message: error.message ?? 'schema validation error',
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
    details: error.params ?? {},
  }));
}

function validatePayload(op: CogWriteOp): { ok: true } | { ok: false; errors: CogRejectionError[] } {
  const mapping: Record<string, any> = {
    Artifact: validators.artifact,
    Narrative: validators.narrative,
    Belief: validators.belief,
    NarrativeClaimLink: validators.narrativeClaimLink,
    BeliefClaimLink: validators.beliefClaimLink,
    NarrativeBeliefLink: validators.narrativeBeliefLink,
    DivergenceMetric: validators.divergenceMetric,
    BeliefGapMetric: validators.beliefGapMetric,
  };

  const validator = mapping[op.entityType];
  if (!validator) {
    return {
      ok: false,
      errors: [
        { code: 'UNKNOWN_ENTITY', message: `No validator registered for ${op.entityType}` },
      ],
    };
  }

  const valid = validator(op.payload);
  if (!valid) {
    return { ok: false, errors: ajvErrorsToItems('PAYLOAD_SCHEMA', validator.errors) };
  }

  return { ok: true };
}

function enforceDomainSeparation(
  ws: CogWriteSet,
  op: CogWriteOp,
): { ok: true } | { ok: false; errors: CogRejectionError[] } {
  const deny = ws.scope?.denyDomains ?? ['RG'];

  if (deny.includes('RG') && op.domain !== 'NG' && op.domain !== 'BG') {
    return {
      ok: false,
      errors: [{ code: 'DOMAIN_DENIED', message: `Domain ${op.domain} not allowed` }],
    };
  }

  const ngOnly = new Set([
    'Artifact',
    'Narrative',
    'NarrativeClaimLink',
    'DivergenceMetric',
  ]);
  const bgOnly = new Set([
    'Belief',
    'BeliefClaimLink',
    'NarrativeBeliefLink',
    'BeliefGapMetric',
  ]);

  if (ngOnly.has(op.entityType) && op.domain !== 'NG') {
    return {
      ok: false,
      errors: [{ code: 'DOMAIN_MISMATCH', message: `${op.entityType} must be NG` }],
    };
  }

  if (bgOnly.has(op.entityType) && op.domain !== 'BG') {
    return {
      ok: false,
      errors: [{ code: 'DOMAIN_MISMATCH', message: `${op.entityType} must be BG` }],
    };
  }

  return { ok: true };
}

export async function applyCogWriteSet(
  store: CogBattleStorage,
  ws: CogWriteSet,
): Promise<CogRejectionReport> {
  const items: CogRejectionItem[] = [];

  if (!validators.cogWriteSet(ws)) {
    return {
      ok: false,
      writesetId: (ws as any).writesetId ?? 'unknown',
      summary: {
        receivedOps: (ws as any).ops?.length ?? 0,
        acceptedOps: 0,
        rejectedOps: (ws as any).ops?.length ?? 0,
      },
      items: [
        {
          opId: 'ENVELOPE',
          status: 'REJECTED',
          errors: ajvErrorsToItems('ENVELOPE_SCHEMA', validators.cogWriteSet.errors),
        },
      ],
    };
  }

  const accepted: Record<string, Record<string, unknown>[]> = {
    Artifact: [],
    Narrative: [],
    Belief: [],
    NarrativeClaimLink: [],
    BeliefClaimLink: [],
    NarrativeBeliefLink: [],
    DivergenceMetric: [],
    BeliefGapMetric: [],
  };

  for (const op of ws.ops) {
    const base = {
      opId: op.opId,
      entityType: op.entityType,
      domain: op.domain,
      action: op.action,
    };

    if (!validators.cogOp(op)) {
      items.push({
        ...base,
        status: 'REJECTED',
        errors: ajvErrorsToItems('OP_SCHEMA', validators.cogOp.errors),
      });
      continue;
    }

    const separated = enforceDomainSeparation(ws, op);
    if (!separated.ok) {
      items.push({ ...base, status: 'REJECTED', errors: separated.errors });
      continue;
    }

    const payloadValidation = validatePayload(op);
    if (!payloadValidation.ok) {
      items.push({ ...base, status: 'REJECTED', errors: payloadValidation.errors });
      continue;
    }

    accepted[op.entityType].push(op.payload);
    items.push({ ...base, status: 'ACCEPTED' });
  }

  await store.putArtifacts(accepted.Artifact as any[]);
  await store.putNarratives(accepted.Narrative as any[]);
  await store.putBeliefs(accepted.Belief as any[]);

  await store.putLinks({
    narrativeClaim: accepted.NarrativeClaimLink as any[],
    beliefClaim: accepted.BeliefClaimLink as any[],
    narrativeBelief: accepted.NarrativeBeliefLink as any[],
  });

  await store.putMetrics({
    divergence: accepted.DivergenceMetric as any[],
    beliefGap: accepted.BeliefGapMetric as any[],
  });

  const receivedOps = ws.ops.length;
  const acceptedOps = items.filter((item) => item.status === 'ACCEPTED').length;
  const rejectedOps = receivedOps - acceptedOps;

  return {
    ok: rejectedOps === 0,
    writesetId: ws.writesetId,
    summary: { receivedOps, acceptedOps, rejectedOps },
    items,
  };
}
