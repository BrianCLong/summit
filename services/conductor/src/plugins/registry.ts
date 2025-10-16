import { Pool } from 'pg';
import { execFile } from 'node:child_process';
import { capabilityRegistry } from '../fabric';
import { recordProvenance, hashObject } from '../provenance/ledger';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function registerPlugin(input: any, actor: string) {
  // cosign verify-blob/verify-attestation (we assume local cosign + policy bundle)
  await verifyCosign(input.ociUri);
  await ingestSbom(input.sbom);
  const {
    rows: [p],
  } = await pg.query(
    `
    INSERT INTO plugin_registry(name,version,oci_uri,digest,signature,sbom,provenance,capabilities,risk,approved)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'unknown',false)
    RETURNING id, name, version, oci_uri AS "ociUri", digest, capabilities, risk, approved, sbom, provenance
  `,
    [
      input.name,
      input.version,
      input.ociUri,
      input.digest,
      input.signature,
      input.sbom || {},
      input.provenance || {},
      input.capabilities || {},
    ],
  );
  registerCapabilities(p);
  recordProvenance({
    reqId: `plugin:${p.id}`,
    step: 'router',
    inputHash: hashObject(input.capabilities || {}),
    outputHash: hashObject(p),
    policy: {
      retention: 'standard-365d',
      purpose: 'engineering',
      licenseClass: 'MIT-OK',
    },
    time: { start: new Date().toISOString(), end: new Date().toISOString() },
    tags: ['plugin', 'registry'],
  });
  return p;
}

export async function approvePlugin(
  id: string,
  risk: string,
  who: string,
  reason: string,
) {
  await pg.query(
    `UPDATE plugin_registry SET approved=true, risk=$2, approved_by=$3, approved_at=now() WHERE id=$1`,
    [id, risk, who],
  );
  await appendAudit('plugin.approve', { id, risk, reason, who });
  return true;
}

async function verifyCosign(uri: string) {
  await new Promise<void>((res, rej) =>
    execFile('cosign', ['verify', uri], (e) => (e ? rej(e) : res())),
  );
}
async function ingestSbom(sbom: any) {
  /* optional normalize */ return sbom;
}
async function appendAudit(kind: string, payload: any) {
  /* write run_ledger or audit table */
}

function registerCapabilities(plugin: any) {
  const models = plugin?.capabilities?.models || plugin?.capabilities?.llms;
  if (!Array.isArray(models)) return;
  for (const model of models) {
    if (!model?.modelId) continue;
    capabilityRegistry.upsert({
      id: `${plugin.id}:${model.modelId}`,
      modelId: model.modelId,
      provider: model.provider || plugin.name,
      skills: model.skills || [],
      costUsdPer1KTokens: Number(model.costUsdPer1KTokens || 0.02),
      latencyMsP95: Number(model.latencyMsP95 || 800),
      latencyMsP50: Number(model.latencyMsP50 || 400),
      contextWindow: Number(model.contextWindow || 8000),
      safety: model.safety || 'baseline',
      dataResidency: model.dataResidency || 'us',
      maxParallel: model.maxParallel || 4,
      tags: model.tags || [],
      evalScore: model.evalScore || 0.7,
    });
  }
}
