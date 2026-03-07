import { validators } from '@intelgraph/summit-schemas/cogbattlespace';
import type { CogBattleStorage } from '../storage';
import type {
  Artifact,
  Belief,
  BeliefClaimLink,
  BeliefGapMetric,
  DivergenceMetric,
  Narrative,
  NarrativeBeliefLink,
  NarrativeClaimLink,
} from '../types';
import type {
  CogRejectionError,
  CogRejectionItem,
  CogRejectionReport,
  CogWriteOp,
  CogWriteSet,
} from './types';

type AjvErrorLike = {
  message?: string;
  instancePath?: string;
  schemaPath?: string;
  params?: Record<string, unknown>;
};

type ValidatableEntity =
  | Artifact
  | Narrative
  | Belief
  | NarrativeClaimLink
  | BeliefClaimLink
  | NarrativeBeliefLink
  | DivergenceMetric
  | BeliefGapMetric;

function toAjvErrorLike(error: unknown): AjvErrorLike {
  if (typeof error === 'object' && error !== null) {
    return error as AjvErrorLike;
  }
  return {};
}

function ajvErrorsToItems(
  prefixCode: string,
  errors: unknown[] | null | undefined,
): CogRejectionError[] {
  return (errors ?? []).map((error) => {
    const typed = toAjvErrorLike(error);
    return {
      code: prefixCode,
      message: typed.message ?? 'schema validation error',
      instancePath: typed.instancePath,
      schemaPath: typed.schemaPath,
      details: typed.params ?? {},
    };
  });
}

function validatePayload(
  op: CogWriteOp,
): { ok: true } | { ok: false; errors: CogRejectionError[] } {
  const mapping = {
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
        {
          code: 'UNKNOWN_ENTITY',
          message: `No validator registered for ${op.entityType}`,
        },
      ],
    };
  }

  if (!validator(op.payload)) {
    return {
      ok: false,
      errors: ajvErrorsToItems('PAYLOAD_SCHEMA', validator.errors),
    };
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
      errors: [
        { code: 'DOMAIN_DENIED', message: `Domain ${op.domain} is not permitted` },
      ],
    };
  }

  const ngOnly = new Set(['Artifact', 'Narrative', 'NarrativeClaimLink', 'DivergenceMetric']);
  const bgOnly = new Set([
    'Belief',
    'BeliefClaimLink',
    'NarrativeBeliefLink',
    'BeliefGapMetric',
  ]);

  if (ngOnly.has(op.entityType) && op.domain !== 'NG') {
    return {
      ok: false,
      errors: [{ code: 'DOMAIN_MISMATCH', message: `${op.entityType} must target NG` }],
    };
  }

  if (bgOnly.has(op.entityType) && op.domain !== 'BG') {
    return {
      ok: false,
      errors: [{ code: 'DOMAIN_MISMATCH', message: `${op.entityType} must target BG` }],
    };
  }

  return { ok: true };
}

function initializeAcceptedBuckets(): Record<string, ValidatableEntity[]> {
  return {
    Artifact: [],
    Narrative: [],
    Belief: [],
    NarrativeClaimLink: [],
    BeliefClaimLink: [],
    NarrativeBeliefLink: [],
    DivergenceMetric: [],
    BeliefGapMetric: [],
  };
}

export async function applyCogWriteSet(
  store: CogBattleStorage,
  ws: CogWriteSet,
): Promise<CogRejectionReport> {
  const items: CogRejectionItem[] = [];

  if (!validators.cogWriteSet(ws)) {
    const received = ws.ops?.length ?? 0;
    return {
      ok: false,
      writesetId: ws.writesetId ?? 'unknown',
      summary: { receivedOps: received, acceptedOps: 0, rejectedOps: received },
      items: [
        {
          opId: 'ENVELOPE',
          status: 'REJECTED',
          errors: ajvErrorsToItems('ENVELOPE_SCHEMA', validators.cogWriteSet.errors),
        },
      ],
    };
  }

  const accepted = initializeAcceptedBuckets();

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

    const separation = enforceDomainSeparation(ws, op);
    if (!separation.ok) {
      items.push({ ...base, status: 'REJECTED', errors: separation.errors });
      continue;
    }

    const payload = validatePayload(op);
    if (!payload.ok) {
      items.push({ ...base, status: 'REJECTED', errors: payload.errors });
      continue;
    }

    accepted[op.entityType].push(op.payload as ValidatableEntity);
    items.push({ ...base, status: 'ACCEPTED' });
  }

  await store.putArtifacts(accepted.Artifact as Artifact[]);
  await store.putNarratives(accepted.Narrative as Narrative[]);
  await store.putBeliefs(accepted.Belief as Belief[]);

  await store.putLinks({
    narrativeClaim: accepted.NarrativeClaimLink as NarrativeClaimLink[],
    beliefClaim: accepted.BeliefClaimLink as BeliefClaimLink[],
    narrativeBelief: accepted.NarrativeBeliefLink as NarrativeBeliefLink[],
  });

  await store.putMetrics({
    divergence: accepted.DivergenceMetric as DivergenceMetric[],
    beliefGap: accepted.BeliefGapMetric as BeliefGapMetric[],
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
