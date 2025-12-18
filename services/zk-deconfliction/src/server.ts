import express from 'express';
import type { Request, Response } from 'express';
import { CommitmentGenerator } from './commitment.js';
import { ZKSetProof } from './proof.js';
import { AuditLogger } from './audit.js';
import { DeconflictRequestSchema } from './types.js';
import type { Salt } from './types.js';

/**
 * ZK Deconfliction API Server
 */

const app = express();
app.use(express.json());

const commitmentGen = new CommitmentGenerator();
const zkProof = new ZKSetProof();
const auditLogger = new AuditLogger();

// In-memory salt storage (use secure storage in production)
const saltStore = new Map<string, Salt>();

/**
 * POST /zk/salt
 * Generate a new salt for a tenant
 */
app.post('/zk/salt', (req: Request, res: Response) => {
  const { tenantId } = req.body;

  if (!tenantId) {
    res.status(400).json({ error: 'tenantId required' });
    return;
  }

  const salt = commitmentGen.generateSalt(tenantId);
  saltStore.set(tenantId, salt);

  res.json({
    tenantId: salt.tenantId,
    salt: salt.salt,
    createdAt: salt.createdAt,
  });
});

/**
 * POST /zk/commit
 * Create commitments for a set of values
 */
app.post('/zk/commit', (req: Request, res: Response) => {
  const { tenantId, values } = req.body;

  if (!tenantId || !values || !Array.isArray(values)) {
    res.status(400).json({ error: 'tenantId and values array required' });
    return;
  }

  const salt = saltStore.get(tenantId);
  if (!salt) {
    res.status(404).json({
      error: 'Salt not found for tenant. Generate salt first via POST /zk/salt',
    });
    return;
  }

  const commitmentSet = commitmentGen.commitSet(values, tenantId, salt.salt);

  res.json({
    tenantId: commitmentSet.tenantId,
    commitments: commitmentSet.commitments.map((c) => c.hash),
    count: commitmentSet.count,
    merkleRoot: commitmentSet.merkleRoot,
  });
});

/**
 * POST /zk/deconflict
 * Check for selector overlaps between two tenants WITHOUT revealing values
 */
app.post('/zk/deconflict', (req: Request, res: Response) => {
  try {
    const parsed = DeconflictRequestSchema.parse(req.body);
    const {
      tenantAId,
      tenantBId,
      tenantACommitments,
      tenantBCommitments,
      auditContext,
    } = parsed;

    // Check overlap
    const { hasOverlap, count } = zkProof.checkOverlap(
      tenantACommitments,
      tenantBCommitments,
    );

    // Generate proof
    const proof = zkProof.generateProof(
      tenantAId,
      tenantBId,
      tenantACommitments,
      tenantBCommitments,
      hasOverlap,
      count,
    );

    // Audit log
    const auditEntry = auditLogger.log(
      tenantAId,
      tenantBId,
      hasOverlap,
      count,
      proof,
      auditContext,
    );

    res.json({
      hasOverlap,
      overlapCount: count,
      proof,
      auditLogId: auditEntry.id,
      timestamp: auditEntry.timestamp,
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

/**
 * GET /zk/audit
 * Retrieve audit logs
 */
app.get('/zk/audit', (req: Request, res: Response) => {
  const { tenantId } = req.query;

  if (tenantId) {
    const logs = auditLogger.getLogsByTenant(tenantId as string);
    res.json({ logs, count: logs.length });
  } else {
    const logs = auditLogger.getLogs();
    res.json({ logs, count: logs.length });
  }
});

/**
 * GET /zk/audit/:id
 * Retrieve specific audit log entry
 */
app.get('/zk/audit/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const log = auditLogger.getLogById(id);

  if (!log) {
    res.status(404).json({ error: 'Audit log not found' });
    return;
  }

  res.json(log);
});

/**
 * GET /health
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'zk-deconfliction',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`ZK Deconfliction service running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /zk/salt          - Generate tenant salt`);
  console.log(`  POST /zk/commit        - Create commitments`);
  console.log(`  POST /zk/deconflict    - Check overlap (ZK)`);
  console.log(`  GET  /zk/audit         - Retrieve audit logs`);
  console.log(`  GET  /zk/audit/:id     - Get specific log`);
  console.log(`  GET  /health           - Health check`);
});

export { app };
