// @ts-nocheck
// Evidence Export and Provenance API Routes
import express from 'express';
import * as crypto from 'crypto';
import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { prometheusConductorMetrics } from '../observability/prometheus.js';
import { getPostgresPool } from '../../db/postgres.js';
import { requirePermission } from '../auth/rbac-middleware.js';
import { usageLedger } from '../../usage/usage-ledger.js';
import {
  buildProvenanceReceipt,
  canonicalStringify,
  EvidenceArtifactRow,
  RunEventRow,
  RunRow,
} from '../../maestro/evidence/receipt.js';
import { detectSuspiciousPayload } from '../../security/suspiciousReceipt.js';
import { isEnabled } from '../../lib/featureFlags.js';
import { provenanceLedger } from '../../provenance/ledger.js';

const router = express.Router();
const metrics = prometheusConductorMetrics as any;

const inlineContentKey = (tenantId: string, artifactId: string) =>
  `inline://tenants/${tenantId}/evidence_artifact_content/${artifactId}`;

const resolveTenantId = (req: express.Request): string | null => {
  const headerTenant = req.headers['x-tenant-id'];
  const tenantId =
    req.user?.tenantId ||
    req.user?.tenant_id ||
    (typeof headerTenant === 'string' ? headerTenant : null);
  return tenantId || null;
};

async function loadRunForTenant(
  runId: string,
  tenantId: string,
): Promise<{ run?: RunRow; forbidden: boolean }> {
  const pool = getPostgresPool();
  const { rows: runRows } = await pool.query<RunRow>(
    `SELECT id, runbook, status, started_at, ended_at, tenant_id
       FROM run
      WHERE id=$1`,
    [runId],
  );

  if (!runRows.length) {
    return { forbidden: false };
  }

  const run = runRows[0];
  if (!run.tenant_id || run.tenant_id !== tenantId) {
    return { forbidden: true };
  }

  return { run, forbidden: false };
}

async function loadRunContext(
  runId: string,
  tenantId: string,
): Promise<{
  run?: RunRow;
  events: RunEventRow[];
  artifacts: EvidenceArtifactRow[];
  forbidden: boolean;
}> {
  const { run, forbidden } = await loadRunForTenant(runId, tenantId);

  if (!run) {
    return { events: [], artifacts: [], forbidden };
  }

  const pool = getPostgresPool();
  const { rows: eventRows } = await pool.query<RunEventRow>(
    `SELECT kind, payload, ts FROM run_event WHERE run_id=$1 ORDER BY ts ASC`,
    [runId],
  );

  const { rows: artifactRows } = await pool.query<EvidenceArtifactRow>(
    `SELECT id, artifact_type, sha256_hash, created_at
       FROM evidence_artifacts
      WHERE run_id=$1
      ORDER BY created_at ASC`,
    [runId],
  );

  return { run, events: eventRows, artifacts: artifactRows, forbidden };
}

router.post(
  '/receipt',
  requirePermission('evidence:create'),
  express.json(),
  async (req, res) => {
    const requestSizeBytes = Buffer.byteLength(
      JSON.stringify(req.body ?? {}),
      'utf8',
    );
    try {
      const { runId } = req.body || {};
      const tenantId = resolveTenantId(req);
      if (!runId) {
        usageLedger.recordUsage({
          operationName: 'conductor.receipt.create',
          tenantId: req?.user?.tenantId,
          userId: req?.user?.userId || req?.user?.sub,
          timestamp: new Date(),
          requestSizeBytes,
          success: false,
          statusCode: 400,
          errorCategory: 'validation',
        });
        return res
          .status(400)
          .json({ success: false, error: 'runId is required' });
      }
      if (!tenantId) {
        usageLedger.recordUsage({
          operationName: 'conductor.receipt.create',
          tenantId: req?.user?.tenantId,
          userId: req?.user?.userId || req?.user?.sub,
          timestamp: new Date(),
          requestSizeBytes,
          success: false,
          statusCode: 400,
          errorCategory: 'validation',
        });
        return res
          .status(400)
          .json({ success: false, error: 'tenantId is required' });
      }

      const { run, events, artifacts, forbidden } = await loadRunContext(
        runId,
        tenantId,
      );

      if (forbidden) {
        return res
          .status(403)
          .json({ success: false, error: 'Run not accessible for tenant' });
      }
      if (!run) {
        return res.status(404).json({ success: false, error: 'Run not found' });
      }

      const receipt = buildProvenanceReceipt(run, events, artifacts);

      // Security Check: Suspicious Payload Detection
      if (isEnabled('SUSPICIOUS_DETECT_ENABLED')) {
        const suspiciousResult = detectSuspiciousPayload(receipt);
        if (suspiciousResult && suspiciousResult.isSuspicious) {
          try {
            // Non-blocking audit event
            await provenanceLedger.appendEntry({
              tenantId: run.tenant_id || 'system', // Fallback if run doesn't have tenantId (though it should)
              actionType: 'SuspiciousPayloadObserved',
              resourceType: 'ProvenanceReceipt',
              resourceId: receipt.receiptId,
              actorId: req.user?.id || 'system',
              actorType: req.user ? 'user' : 'system',
              payload: {
                reason: suspiciousResult.reason,
                details: suspiciousResult.details,
                runId: runId
              },
              metadata: {
                detectionSource: 'receipt-ingestion'
              }
            });
            console.warn(`[SuspiciousPayload] Detected suspicious payload in receipt ${receipt.receiptId}: ${suspiciousResult.reason}`);
          } catch (auditError) {
            console.error('Failed to emit suspicious payload audit event', auditError);
            // Don't block the request
          }
        }
      }

      const receiptJson = canonicalStringify(receipt);
      const receiptBuffer = Buffer.from(receiptJson);
      const artifactId = randomUUID();
      const sha256Hash = createHash('sha256')
        .update(receiptBuffer)
        .digest('hex');

      const pool = getPostgresPool();

      await pool.query(
        `INSERT INTO evidence_artifacts
         (id, run_id, artifact_type, s3_key, sha256_hash, size_bytes, created_at)
         VALUES ($1, $2, 'receipt', $3, $4, $5, now())`,
        [
          artifactId,
          runId,
          inlineContentKey(tenantId, artifactId),
          sha256Hash,
          receiptBuffer.length,
        ],
      );

      await pool.query(
        `INSERT INTO evidence_artifact_content (artifact_id, content, content_type)
         VALUES ($1, $2, $3)`,
        [artifactId, receiptBuffer, 'application/json'],
      );

      usageLedger.recordUsage({
        operationName: 'conductor.receipt.create',
        tenantId: req?.user?.tenantId,
        userId: req?.user?.userId || req?.user?.sub,
        timestamp: new Date(),
        requestSizeBytes,
        success: true,
        statusCode: 200,
      });

      return res.json({ success: true, data: { receipt, artifactId } });
    } catch (error: any) {
      const message =
        error?.message || 'Failed to generate provenance receipt';
      usageLedger.recordUsage({
        operationName: 'conductor.receipt.create',
        tenantId: req?.user?.tenantId,
        userId: req?.user?.userId || req?.user?.sub,
        timestamp: new Date(),
        requestSizeBytes,
        success: false,
        statusCode: 500,
        errorCategory: 'runtime',
      });
      return res.status(500).json({ success: false, error: message });
    }
  },
);

router.get(
  '/receipt/:runId',
  requirePermission('evidence:read'),
  async (req, res) => {
    try {
      const { runId } = req.params;
      const tenantId = resolveTenantId(req);

      if (!tenantId) {
        return res
          .status(400)
          .json({ success: false, error: 'tenantId is required' });
      }

      const { run, forbidden } = await loadRunForTenant(runId, tenantId);

      if (forbidden) {
        return res
          .status(403)
          .json({ success: false, error: 'Run not accessible for tenant' });
      }
      if (!run) {
        return res.status(404).json({ success: false, error: 'Run not found' });
      }

      const pool = getPostgresPool();
      const { rows: artifactRows } = await pool.query<EvidenceArtifactRow>(
        `SELECT id FROM evidence_artifacts
         WHERE run_id=$1 AND artifact_type='receipt'
         ORDER BY created_at DESC
         LIMIT 1`,
        [runId],
      );

      if (!artifactRows.length) {
        return res
          .status(404)
          .json({ success: false, error: 'Receipt not found' });
      }

      const artifactId = artifactRows[0].id;
      const { rows: contentRows } = await pool.query<{ content: Buffer }>(
        `SELECT content FROM evidence_artifact_content WHERE artifact_id=$1`,
        [artifactId],
      );

      if (!contentRows.length) {
        return res
          .status(404)
          .json({ success: false, error: 'Receipt content not found' });
      }

      const receipt = JSON.parse(contentRows[0].content.toString('utf8'));
      return res.json({ success: true, data: { receipt } });
    } catch (error: any) {
      const message = error?.message || 'Failed to load receipt';
      return res.status(500).json({ success: false, error: message });
    }
  },
);

interface EvidenceBundle {
  id: string;
  timestamp: Date;
  runId: string;
  nodeId?: string;
  metadata: {
    version: string;
    format: string;
    generator: string;
  };
  evidence: {
    decision: any;
    inputs: any;
    outputs: any;
    artifacts: any[];
    provenance: any;
    sbom?: any;
    attestations?: any[];
  };
  signature?: string;
  hash: string;
}

interface Artifact {
  id: string;
  type: 'log' | 'output' | 'config' | 'attestation' | 'sbom';
  name: string;
  content?: string;
  contentType: string;
  hash: string;
  size: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * POST /api/maestro/v1/evidence/export
 * Export evidence bundle with digital signature
 */
router.post('/export', async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      runId,
      nodeId,
      format = 'json',
      includeArtifacts = true,
      sign = true,
    } = req.body;
    const tenantId = resolveTenantId(req);

    if (!runId) {
      return res.status(400).json({
        error: 'runId is required',
        code: 'MISSING_RUN_ID',
      });
    }
    if (!tenantId) {
      return res.status(400).json({
        error: 'tenantId is required',
        code: 'MISSING_TENANT_ID',
      });
    }

    const runLookup = await loadRunForTenant(runId, tenantId);
    if (runLookup.forbidden) {
      return res.status(403).json({
        error: 'Run not accessible for tenant',
        code: 'TENANT_SCOPE_VIOLATION',
      });
    }
    if (!runLookup.run) {
      return res.status(404).json({
        error: 'Run not found',
        code: 'RUN_NOT_FOUND',
      });
    }

    // Generate evidence bundle
    const evidenceBundle = await generateEvidenceBundle(runId, nodeId, {
      includeArtifacts,
      format,
      tenantId,
    });

    // Sign the bundle if requested
    if (sign) {
      evidenceBundle.signature = await signEvidenceBundle(evidenceBundle);
    }

    // Track metrics
    const duration = Date.now() - startTime;
    metrics?.evidenceExportLatency?.observe(duration / 1000);
    metrics?.evidenceExportRequests?.inc({
      status: 'success',
      format,
    });

    // Return bundle based on format
    if (format === 'download') {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="evidence-${runId}-${Date.now()}.json"`,
      );
      res.setHeader('Content-Type', 'application/json');
      return res.json(evidenceBundle);
    }

    res.json({
      success: true,
      evidenceId: evidenceBundle.id,
      hash: evidenceBundle.hash,
      signature: evidenceBundle.signature,
      bundle: evidenceBundle,
      downloadUrl: `/api/maestro/v1/evidence/${evidenceBundle.id}/download`,
      verifyUrl: `/api/maestro/v1/evidence/${evidenceBundle.id}/verify`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    metrics?.evidenceExportLatency?.observe(duration / 1000);
    metrics?.evidenceExportRequests?.inc({
      status: 'error',
      format: req.body.format || 'json',
    });

    console.error('Evidence export error:', error);
    res.status(500).json({
      error: 'Failed to export evidence',
      code: 'EVIDENCE_EXPORT_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/maestro/v1/evidence/:evidenceId/download
 * Download evidence bundle
 */
router.get('/:evidenceId/download', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { format = 'json' } = req.query;

    // Fetch evidence bundle from storage
    const evidenceBundle = await getEvidenceBundle(evidenceId);

    if (!evidenceBundle) {
      return res.status(404).json({
        error: 'Evidence bundle not found',
        code: 'EVIDENCE_NOT_FOUND',
        evidenceId,
      });
    }

    const filename = `evidence-${evidenceBundle.runId}-${evidenceId}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.json(evidenceBundle);
        break;
      case 'yaml':
        res.setHeader('Content-Type', 'text/yaml');
        // In production, convert to YAML
        res.send(
          `# Evidence Bundle\n# Generated: ${evidenceBundle.timestamp}\n\n${JSON.stringify(evidenceBundle, null, 2)}`,
        );
        break;
      default:
        res.setHeader('Content-Type', 'application/json');
        res.json(evidenceBundle);
    }

    metrics?.evidenceDownloadRequests?.inc({
      status: 'success',
      format,
    });
  } catch (error: any) {
    metrics?.evidenceDownloadRequests?.inc({
      status: 'error',
      format: req.query.format || 'json',
    });

    console.error('Evidence download error:', error);
    res.status(500).json({
      error: 'Failed to download evidence',
      code: 'EVIDENCE_DOWNLOAD_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/maestro/v1/evidence/:evidenceId/verify
 * Verify evidence bundle signature and integrity
 */
router.post('/:evidenceId/verify', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { signature, expectedHash } = req.body;

    const evidenceBundle = await getEvidenceBundle(evidenceId);

    if (!evidenceBundle) {
      return res.status(404).json({
        error: 'Evidence bundle not found',
        code: 'EVIDENCE_NOT_FOUND',
        evidenceId,
      });
    }

    const verification = await verifyEvidenceBundle(
      evidenceBundle,
      signature || evidenceBundle.signature,
      expectedHash,
    );

    metrics?.evidenceVerificationRequests?.inc({
      status: verification.valid ? 'success' : 'failed',
    });

    res.json({
      evidenceId,
      valid: verification.valid,
      verification,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    metrics?.evidenceVerificationRequests?.inc({
      status: 'error',
    });

    console.error('Evidence verification error:', error);
    res.status(500).json({
      error: 'Failed to verify evidence',
      code: 'EVIDENCE_VERIFICATION_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/maestro/v1/evidence/:evidenceId/artifacts
 * Get artifacts for evidence bundle
 */
router.get('/:evidenceId/artifacts', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { type } = req.query;

    const evidenceBundle = await getEvidenceBundle(evidenceId);

    if (!evidenceBundle) {
      return res.status(404).json({
        error: 'Evidence bundle not found',
        code: 'EVIDENCE_NOT_FOUND',
        evidenceId,
      });
    }

    let artifacts = evidenceBundle.evidence.artifacts || [];

    if (type) {
      artifacts = artifacts.filter(
        (artifact: Artifact) => artifact.type === type,
      );
    }

    res.json({
      evidenceId,
      artifacts: artifacts.map((artifact: Artifact) => ({
        id: artifact.id,
        type: artifact.type,
        name: artifact.name,
        contentType: artifact.contentType,
        size: artifact.size,
        timestamp: artifact.timestamp,
        downloadUrl: `/api/maestro/v1/evidence/${evidenceId}/artifacts/${artifact.id}/download`,
        metadata: artifact.metadata,
      })),
      count: artifacts.length,
    });
  } catch (error: any) {
    console.error('Artifacts fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch artifacts',
      code: 'ARTIFACTS_FETCH_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/maestro/v1/evidence/:evidenceId/artifacts/:artifactId/download
 * Download specific artifact
 */
router.get('/:evidenceId/artifacts/:artifactId/download', async (req, res) => {
  try {
    const { evidenceId, artifactId } = req.params;

    const evidenceBundle = await getEvidenceBundle(evidenceId);

    if (!evidenceBundle) {
      return res.status(404).json({
        error: 'Evidence bundle not found',
        code: 'EVIDENCE_NOT_FOUND',
      });
    }

    const artifact = evidenceBundle.evidence.artifacts?.find(
      (a: Artifact) => a.id === artifactId,
    );

    if (!artifact) {
      return res.status(404).json({
        error: 'Artifact not found',
        code: 'ARTIFACT_NOT_FOUND',
        artifactId,
      });
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${artifact.name}"`,
    );
    res.setHeader('Content-Type', artifact.contentType);

    if (artifact.content) {
      res.send(artifact.content);
    } else {
      // In production, fetch from blob storage
      res.json({ message: 'Artifact content not available in storage' });
    }
  } catch (error: any) {
    console.error('Artifact download error:', error);
    res.status(500).json({
      error: 'Failed to download artifact',
      code: 'ARTIFACT_DOWNLOAD_FAILED',
      message: error.message,
    });
  }
});

// Helper functions

async function generateEvidenceBundle(
  runId: string,
  nodeId?: string,
  options: any = {},
): Promise<EvidenceBundle> {
  const resolvedTenantId =
    typeof options.tenantId === 'string' ? options.tenantId : 'unknown';
  const bundleId = `evidence-${runId}-${nodeId || 'full'}-${Date.now()}`;

  // In production, fetch from run database
  const mockDecision = {
    selectedExpert: 'openai-gpt-4',
    confidence: 0.92,
    reason: 'High confidence task, budget available, no PII detected',
    timestamp: new Date().toISOString(),
    alternatives: [
      {
        expert: 'anthropic-claude-3',
        score: 0.87,
        rejectionReason: 'Higher cost',
      },
      {
        expert: 'local-llm',
        score: 0.75,
        rejectionReason: 'Lower performance',
      },
    ],
  };

  const mockInputs = {
    query: 'Analyze the security implications of...',
    context: {
      userId: 'user-123',
      tenantId: resolvedTenantId,
      sensitivity: 'internal',
      urgency: 'medium',
    },
    constraints: {
      maxCost: 1.0,
      maxLatency: 5000,
      allowedProviders: ['openai', 'anthropic'],
    },
  };

  const mockOutputs = {
    result: 'Analysis complete...',
    tokens: {
      input: 150,
      output: 500,
      total: 650,
    },
    cost: 0.045,
    latency: 1200,
    model: 'gpt-4-0125-preview',
  };

  const artifacts: Artifact[] = [];

  if (options.includeArtifacts) {
    artifacts.push(
      {
        id: `${bundleId}-log`,
        type: 'log',
        name: 'execution.log',
        content: `[${new Date().toISOString()}] Starting execution...\n[${new Date().toISOString()}] Completed successfully`,
        contentType: 'text/plain',
        hash: createHash('sha256').update('log-content').digest('hex'),
        size: 125,
        timestamp: new Date(),
        metadata: { level: 'info', source: 'maestro-conductor' },
      },
      {
        id: `${bundleId}-config`,
        type: 'config',
        name: 'run-config.json',
        content: JSON.stringify({ runId, nodeId, options }, null, 2),
        contentType: 'application/json',
        hash: crypto
          .createHash('sha256')
          .update('config-content')
          .digest('hex'),
        size: 256,
        timestamp: new Date(),
      },
    );

    // Add SBOM if available
    artifacts.push({
      id: `${bundleId}-sbom`,
      type: 'sbom',
      name: 'software-bill-of-materials.json',
      content: JSON.stringify(
        {
          bomFormat: 'CycloneDX',
          specVersion: '1.4',
          serialNumber: `urn:uuid:${bundleId}`,
          version: 1,
          metadata: {
            timestamp: new Date().toISOString(),
            tools: [
              {
                vendor: 'IntelGraph',
                name: 'Maestro Conductor',
                version: '1.0.0',
              },
            ],
          },
          components: [
            {
              type: 'library',
              name: 'openai-gpt-4',
              version: '0125-preview',
              supplier: { name: 'OpenAI' },
              hashes: [{ alg: 'SHA-256', content: 'abc123...' }],
            },
          ],
        },
        null,
        2,
      ),
      contentType: 'application/json',
      hash: createHash('sha256').update('sbom-content').digest('hex'),
      size: 512,
      timestamp: new Date(),
      metadata: { format: 'CycloneDX', version: '1.4' },
    });
  }

  const bundle: EvidenceBundle = {
    id: bundleId,
    timestamp: new Date(),
    runId,
    nodeId,
    metadata: {
      version: '1.0.0',
      format: 'intelgraph-evidence-v1',
      generator: 'maestro-conductor',
    },
    evidence: {
      decision: mockDecision,
      inputs: mockInputs,
      outputs: mockOutputs,
      artifacts,
      provenance: {
        agent: 'maestro-conductor',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        build: process.env.BUILD_ID || 'local',
      },
      sbom: artifacts.find((a) => a.type === 'sbom')?.content
        ? JSON.parse(artifacts.find((a) => a.type === 'sbom').content)
        : undefined,
      attestations: [
        {
          type: 'execution',
          statement:
            'This execution completed successfully with no policy violations',
          timestamp: new Date().toISOString(),
          signature: 'mock-attestation-signature',
        },
      ],
    },
    hash: '',
  };

  // Calculate hash of bundle content
  const bundleContent = JSON.stringify({
    ...bundle,
    signature: undefined,
    hash: undefined,
  });
  bundle.hash = createHash('sha256').update(bundleContent).digest('hex');

  return bundle;
}

async function signEvidenceBundle(bundle: EvidenceBundle): Promise<string> {
  // In production, use proper signing key from secure storage
  const privateKey = process.env.EVIDENCE_SIGNING_KEY || 'mock-private-key';

  const payload = {
    bundleId: bundle.id,
    hash: bundle.hash,
    timestamp: bundle.timestamp,
    iat: Math.floor(Date.now() / 1000),
    iss: 'maestro-conductor',
    sub: bundle.runId,
  };

  return jwt.sign(payload, privateKey, { algorithm: 'HS256' });
}

async function verifyEvidenceBundle(
  bundle: EvidenceBundle,
  signature?: string,
  expectedHash?: string,
) {
  const verification = {
    valid: false,
    checks: {
      hashMatch: false,
      signatureValid: false,
      timestampValid: false,
      integrityValid: false,
    },
    errors: [] as string[],
  };

  try {
    // Verify hash
    const bundleContent = JSON.stringify({
      ...bundle,
      signature: undefined,
      hash: undefined,
    });
    const calculatedHash = crypto
      .createHash('sha256')
      .update(bundleContent)
      .digest('hex');

    verification.checks.hashMatch = calculatedHash === bundle.hash;
    if (!verification.checks.hashMatch) {
      verification.errors.push(
        'Hash mismatch - bundle may have been tampered with',
      );
    }

    if (expectedHash) {
      const expectedHashMatch = calculatedHash === expectedHash;
      if (!expectedHashMatch) {
        verification.errors.push('Hash does not match expected value');
      }
    }

    // Verify signature
    if (signature) {
      try {
        const privateKey =
          process.env.EVIDENCE_SIGNING_KEY || 'mock-private-key';
        const decoded = jwt.verify(signature, privateKey) as any;

        verification.checks.signatureValid =
          decoded.bundleId === bundle.id && decoded.hash === bundle.hash;
        if (!verification.checks.signatureValid) {
          verification.errors.push('Digital signature is invalid');
        }

        // Check timestamp (not too old)
        const signatureAge = Date.now() / 1000 - decoded.iat;
        verification.checks.timestampValid = signatureAge < 365 * 24 * 60 * 60; // 1 year
        if (!verification.checks.timestampValid) {
          verification.errors.push('Signature timestamp is too old');
        }
      } catch (jwtError) {
        verification.errors.push(
          `Signature verification failed: ${jwtError.message}`,
        );
      }
    } else {
      verification.errors.push('No signature provided for verification');
    }

    // Verify integrity
    verification.checks.integrityValid =
      bundle.evidence && bundle.metadata && bundle.id;
    if (!verification.checks.integrityValid) {
      verification.errors.push('Bundle structure is invalid');
    }

    verification.valid = Object.values(verification.checks).every(
      (check) => check === true,
    );
  } catch (error: any) {
    verification.errors.push(`Verification error: ${error.message}`);
  }

  return verification;
}

async function getEvidenceBundle(
  evidenceId: string,
): Promise<EvidenceBundle | null> {
  // In production, fetch from database or storage
  // For now, return a mock bundle based on the ID
  if (!evidenceId || !evidenceId.startsWith('evidence-')) {
    return null;
  }

  return generateEvidenceBundle('mock-run-id', 'mock-node-id', {
    includeArtifacts: true,
  });
}

export { router as evidenceRoutes };
