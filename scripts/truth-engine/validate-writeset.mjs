import fs from 'node:fs/promises';
import path from 'node:path';

const schemaPath = path.resolve('schemas/truth-engine/writeset.schema.json');

function isIsoDate(value) {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function isHexSha256(value) {
  return typeof value === 'string' && /^[a-fA-F0-9]{64}$/.test(value);
}

export async function loadSchema() {
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

function validateRequiredFields(writeset) {
  const required = ['writeset_id', 'system_time', 'source', 'ops', 'provenance'];
  return required
    .filter((key) => !(key in writeset))
    .map((key) => ({ path: `/${key}`, message: 'is required', keyword: 'required' }));
}

function validateArtifact(artifact, idx) {
  const errors = [];
  if (!artifact || typeof artifact !== 'object') {
    errors.push({ path: `/provenance/artifacts/${idx}`, message: 'must be object', keyword: 'type' });
    return errors;
  }

  if (!artifact.artifact_id) {
    errors.push({
      path: `/provenance/artifacts/${idx}/artifact_id`,
      message: 'is required',
      keyword: 'required'
    });
  }
  if (!artifact.type) {
    errors.push({ path: `/provenance/artifacts/${idx}/type`, message: 'is required', keyword: 'required' });
  }
  if (!isHexSha256(artifact.sha256)) {
    errors.push({
      path: `/provenance/artifacts/${idx}/sha256`,
      message: 'must be a 64-char hex SHA256',
      keyword: 'pattern'
    });
  }

  return errors;
}

function validateClaim(claim, opIndex) {
  const errors = [];
  const required = ['claim_id', 'subject', 'predicate', 'object', 'confidence', 'time', 'evidence_ids'];

  for (const key of required) {
    if (!(key in claim)) {
      errors.push({ path: `/ops/${opIndex}/claim/${key}`, message: 'is required', keyword: 'required' });
    }
  }

  if (typeof claim.confidence !== 'number' || claim.confidence < 0 || claim.confidence > 1) {
    errors.push({
      path: `/ops/${opIndex}/claim/confidence`,
      message: 'must be a number between 0 and 1',
      keyword: 'range'
    });
  }

  if (!isIsoDate(claim?.time?.valid_from)) {
    errors.push({
      path: `/ops/${opIndex}/claim/time/valid_from`,
      message: 'must be ISO datetime',
      keyword: 'format'
    });
  }

  if (
    claim?.time?.valid_to !== null &&
    claim?.time?.valid_to !== undefined &&
    !isIsoDate(claim.time.valid_to)
  ) {
    errors.push({
      path: `/ops/${opIndex}/claim/time/valid_to`,
      message: 'must be null or ISO datetime',
      keyword: 'format'
    });
  }

  if (!Array.isArray(claim.evidence_ids) || claim.evidence_ids.length === 0) {
    errors.push({
      path: `/ops/${opIndex}/claim/evidence_ids`,
      message: 'must contain at least one evidence id',
      keyword: 'minItems'
    });
  }

  return errors;
}

function validateOps(writeset) {
  const errors = [];
  if (!Array.isArray(writeset.ops) || writeset.ops.length === 0) {
    errors.push({ path: '/ops', message: 'must be a non-empty array', keyword: 'minItems' });
    return errors;
  }

  for (const [index, op] of writeset.ops.entries()) {
    if (op.op === 'UPSERT_CLAIM') {
      if (!['NG', 'BG', 'RG'].includes(op.graph)) {
        errors.push({ path: `/ops/${index}/graph`, message: 'must be NG/BG/RG', keyword: 'enum' });
      }
      errors.push(...validateClaim(op.claim || {}, index));
      continue;
    }

    if (op.op === 'PROPOSE_PROMOTION') {
      const promotion = op.promotion || {};
      if (!promotion.promotion_id || !promotion.claim_id) {
        errors.push({
          path: `/ops/${index}/promotion`,
          message: 'promotion_id and claim_id are required',
          keyword: 'required'
        });
      }
      if (!['NG', 'BG'].includes(promotion.from_graph)) {
        errors.push({ path: `/ops/${index}/promotion/from_graph`, message: 'must be NG/BG', keyword: 'enum' });
      }
      if (promotion.to_graph !== 'RG') {
        errors.push({ path: `/ops/${index}/promotion/to_graph`, message: 'must be RG', keyword: 'const' });
      }
      continue;
    }

    errors.push({ path: `/ops/${index}/op`, message: 'unknown operation type', keyword: 'enum' });
  }

  return errors;
}

export function assertEvidenceIntegrity(writeset) {
  const artifactIds = new Set((writeset.provenance?.artifacts || []).map((artifact) => artifact.artifact_id));
  const violations = [];

  for (const op of writeset.ops || []) {
    if (op.op !== 'UPSERT_CLAIM') {
      continue;
    }

    for (const evidenceId of op.claim.evidence_ids || []) {
      if (!artifactIds.has(evidenceId)) {
        violations.push({
          path: `/ops/${op.claim.claim_id}/evidence_ids`,
          message: `evidence_id ${evidenceId} missing from provenance.artifacts`
        });
      }
    }
  }

  return violations;
}

export async function validateWriteSet(writeset) {
  await loadSchema();

  const errors = [];
  errors.push(...validateRequiredFields(writeset));

  if (!isIsoDate(writeset.system_time)) {
    errors.push({ path: '/system_time', message: 'must be ISO datetime', keyword: 'format' });
  }

  const artifacts = writeset.provenance?.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    errors.push({ path: '/provenance/artifacts', message: 'must be a non-empty array', keyword: 'minItems' });
  } else {
    artifacts.forEach((artifact, index) => errors.push(...validateArtifact(artifact, index)));
  }

  errors.push(...validateOps(writeset));

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const integrityViolations = assertEvidenceIntegrity(writeset);
  if (integrityViolations.length > 0) {
    return { valid: false, errors: integrityViolations };
  }

  return { valid: true, errors: [] };
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/truth-engine/validate-writeset.mjs <writeset.json>');
    process.exit(2);
  }

  const payload = JSON.parse(await fs.readFile(path.resolve(file), 'utf8'));
  const writesets = Array.isArray(payload) ? payload : [payload];

  const results = [];
  let hasFailure = false;

  for (const writeset of writesets) {
    const result = await validateWriteSet(writeset);
    results.push({ writeset_id: writeset.writeset_id ?? null, ...result });
    if (!result.valid) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    console.error(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(results, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
