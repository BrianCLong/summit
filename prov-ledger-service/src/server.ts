import Fastify from 'fastify';
import { z } from 'zod';
import {
  registerEvidence,
  createClaim,
  buildManifest,
  checkLicenses,
  getProvenance,
  recordTransform,
} from './ledger';
import tar from 'tar-stream';
import { createGzip } from 'zlib';
import pino from 'pino';
// Note: In production, this would import from the actual OPA client service
// For now, we'll create a simplified local version

const app = Fastify({ logger: true });

// Simplified OPA evaluation for export policies
interface ExportPolicyInput {
  action: string;
  dataset: {
    sources: Array<{
      id: string;
      license: string;
      owner: string;
      classification?: string;
    }>;
  };
  context: {
    user_id: string;
    user_role: string;
    tenant_id: string;
    purpose: string;
    export_type: 'analysis' | 'report' | 'dataset' | 'api';
    approvals?: string[];
    step_up_verified?: boolean;
  };
}

interface PolicyDecision {
  allow: boolean;
  violations: Array<{
    code: string;
    message: string;
    appeal_code: string;
    appeal_url: string;
    severity: 'blocking' | 'warning';
  }>;
  requires_approval: boolean;
  requires_step_up: boolean;
}

async function evaluateExportPolicy(
  input: ExportPolicyInput,
): Promise<PolicyDecision> {
  const violations: PolicyDecision['violations'] = [];
  let requires_approval = false;
  let requires_step_up = false;

  // Check each source license
  for (const source of input.dataset.sources) {
    // Blocked licenses
    if (
      ['DISALLOW_EXPORT', 'VIEW_ONLY', 'SEAL_ONLY', 'EMBARGOED'].includes(
        source.license,
      )
    ) {
      violations.push({
        code: 'LICENSE_VIOLATION',
        message: `Export blocked by license ${source.license} for source ${source.id}`,
        appeal_code: 'LIC001',
        appeal_url: 'https://compliance.intelgraph.io/appeal/LIC001',
        severity: 'blocking',
      });
    }

    // Commercial purpose restrictions
    if (
      input.context.purpose === 'commercial' &&
      ['GPL-3.0', 'AGPL-3.0', 'CC-BY-NC'].includes(source.license)
    ) {
      violations.push({
        code: 'COMMERCIAL_USE_VIOLATION',
        message: `Commercial use not permitted for license ${source.license}`,
        appeal_code: 'COM001',
        appeal_url: 'https://compliance.intelgraph.io/appeal/COM001',
        severity: 'blocking',
      });
    }

    // Approval requirements
    if (
      ['GPL-3.0', 'AGPL-3.0'].includes(source.license) &&
      input.context.export_type === 'dataset'
    ) {
      requires_approval = true;
    }

    // Step-up requirements for sensitive data
    if (
      source.classification === 'restricted' ||
      source.classification === 'confidential'
    ) {
      requires_step_up = true;
    }
  }

  // Check user permissions
  if (
    !['analyst', 'investigator', 'admin', 'compliance-officer'].includes(
      input.context.user_role,
    )
  ) {
    violations.push({
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'User role does not have export permissions',
      appeal_code: 'AUTH001',
      appeal_url: 'https://compliance.intelgraph.io/appeal/AUTH001',
      severity: 'blocking',
    });
  }

  // Check step-up authentication
  if (requires_step_up && !input.context.step_up_verified) {
    violations.push({
      code: 'STEP_UP_REQUIRED',
      message: 'Step-up authentication required for sensitive data export',
      appeal_code: 'AUTH002',
      appeal_url: 'https://compliance.intelgraph.io/appeal/AUTH002',
      severity: 'blocking',
    });
  }

  // Check approvals
  if (
    requires_approval &&
    (!input.context.approvals ||
      !input.context.approvals.includes('compliance-officer'))
  ) {
    violations.push({
      code: 'APPROVAL_REQUIRED',
      message: 'Compliance officer approval required for this export',
      appeal_code: 'APP001',
      appeal_url: 'https://compliance.intelgraph.io/appeal/APP001',
      severity: 'blocking',
    });
  }

  const blockingViolations = violations.filter(
    (v) => v.severity === 'blocking',
  );
  const allow = blockingViolations.length === 0;

  return {
    allow,
    violations,
    requires_approval,
    requires_step_up,
  };
}

const evidenceSchema = z.object({
  contentHash: z.string(),
  licenseId: z.string(),
  source: z.string(),
  transforms: z.array(z.string()).default([]),
});

app.post('/evidence/register', async (req, reply) => {
  const body = evidenceSchema.parse(req.body);
  const evid = registerEvidence({ ...body });
  reply.send({ evidenceId: evid.id });
});

const claimSchema = z.object({
  evidenceId: z.array(z.string()),
  text: z.string(),
  confidence: z.number(),
  links: z.array(z.string()).default([]),
});

app.post('/claims', async (req, reply) => {
  const body = claimSchema.parse(req.body);
  const claim = createClaim({
    evidenceIds: body.evidenceId,
    text: body.text,
    confidence: body.confidence,
    links: body.links,
  });
  reply.send({ claimId: claim.id });
});

const exportSchema = z.object({ claimId: z.array(z.string()) });

// Get provenance chain for evidence or claim
app.get('/prov/evidence/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const provenance = getProvenance(id);
  if (!provenance) {
    reply.status(404).send({ error: 'Evidence not found' });
    return;
  }
  reply.send(provenance);
});

// Record a transform operation
const transformSchema = z.object({
  inputIds: z.array(z.string()),
  outputId: z.string(),
  operation: z.string(),
  parameters: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
});

app.post('/prov/transform', async (req, reply) => {
  const body = transformSchema.parse(req.body);
  const transform = recordTransform({
    ...body,
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
  });
  reply.send({ transformId: transform.id });
});

// Enhanced export schema with policy context
const enhancedExportSchema = z.object({
  claimId: z.array(z.string()),
  context: z.object({
    user_id: z.string(),
    user_role: z.string(),
    tenant_id: z.string(),
    purpose: z.string(),
    export_type: z.enum(['analysis', 'report', 'dataset', 'api']),
    approvals: z.array(z.string()).optional(),
    step_up_verified: z.boolean().optional(),
  }),
});

// Export with enhanced policy enforcement
app.post('/prov/export/:caseId', async (req, reply) => {
  const { caseId } = req.params as { caseId: string };
  const body = enhancedExportSchema.parse(req.body);

  try {
    const manifest = buildManifest(body.claimId);

    // Prepare OPA policy input
    const policyInput: ExportPolicyInput = {
      action: 'export',
      dataset: {
        sources: manifest.claims.map((claim) => {
          // Get evidence for this claim to extract license info
          const evidence = getEvidence(claim.id);
          return {
            id: claim.id,
            license: evidence?.licenseId || 'UNKNOWN',
            owner: evidence?.source || 'unknown',
            classification: 'standard', // TODO: Get actual classification
          };
        }),
      },
      context: body.context,
    };

    // Evaluate export policy
    const policyDecision = await evaluateExportPolicy(policyInput);

    if (!policyDecision.allow) {
      const response = {
        error: 'Export denied by policy',
        violations: policyDecision.violations,
        requires_approval: policyDecision.requires_approval,
        requires_step_up: policyDecision.requires_step_up,
        appeal_instructions:
          'Use the appeal URLs provided in violations to request manual review',
      };

      app.log.warn(
        {
          caseId,
          userId: body.context.user_id,
          violations: policyDecision.violations.map((v) => v.code),
        },
        'Export denied by policy',
      );

      reply.status(403).send(response);
      return;
    }

    // Enhanced manifest with provenance chains
    const enhancedManifest = {
      ...manifest,
      caseId,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      provenance: {
        evidenceChains: manifest.claims.map((claim) => ({
          claimId: claim.id,
          evidence: getProvenance(claim.id),
        })),
      },
    };

    const pack = tar.pack();
    pack.entry(
      { name: 'manifest.json' },
      JSON.stringify(enhancedManifest, null, 2),
    );

    // Add individual evidence files
    for (const claim of manifest.claims) {
      const provenance = getProvenance(claim.id);
      if (provenance) {
        pack.entry(
          { name: `evidence/${claim.id}.json` },
          JSON.stringify(provenance, null, 2),
        );
      }
    }

    pack.finalize();

    reply.header('Content-Type', 'application/gzip');
    reply.header(
      'Content-Disposition',
      `attachment; filename="case-${caseId}-bundle.tgz"`,
    );
    reply.send(pack.pipe(createGzip()));
  } catch (error) {
    app.log.error({ error, caseId }, 'Export generation failed');
    reply.status(500).send({ error: 'Export generation failed' });
  }
});

// Legacy export endpoint
app.post('/exports', async (req, reply) => {
  const body = exportSchema.parse(req.body);
  const manifest = buildManifest(body.claimId);
  const licenseCheck = checkLicenses(manifest.licenses);
  if (!licenseCheck.valid) {
    reply.status(400).send({
      error: licenseCheck.reason,
      appealCode: licenseCheck.appealCode,
    });
    return;
  }
  const pack = tar.pack();
  pack.entry({ name: 'manifest.json' }, JSON.stringify(manifest, null, 2));
  pack.finalize();
  reply.header('Content-Type', 'application/gzip');
  reply.header('Content-Disposition', 'attachment; filename="bundle.tgz"');
  reply.send(pack.pipe(createGzip()));
});

if (require.main === module) {
  app.listen({ port: 3000, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

export default app;
