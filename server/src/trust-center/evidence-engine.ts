/**
 * Evidence Engine
 *
 * Core engine for collecting, validating, redacting, and signing
 * compliance evidence from various sources.
 *
 * @module trust-center/evidence-engine
 */

import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { createHash, createSign, createVerify } from 'crypto';
import fs from 'fs/promises';

import type {
  EvidenceSnapshot,
  EvidenceSource,
  EvidenceRequest,
  ControlDefinition,
  RedactionRule,
  CryptographicSignature,
  ActorReference,
  DataClassification,
} from './types/index.js';

import { CONTROL_MAPPINGS } from './types/control-evidence-mappings.js';

// =============================================================================
// Types
// =============================================================================

interface EvidencePackage {
  id: string;
  requestId: string;
  tenantId: string;
  controlIds: string[];
  snapshots: EvidenceSnapshot[];
  metadata: {
    generatedAt: string;
    expiresAt: string;
    format: string;
    redactionApplied: boolean;
  };
  integrity: {
    packageHash: string;
    signature?: CryptographicSignature;
  };
}

interface CollectionJob {
  id: string;
  controlId: string;
  sourceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  {
    pattern: 'tenant_[a-zA-Z0-9]+',
    replacement: '[REDACTED_TENANT]',
    category: 'tenant_id',
    isRegex: true,
  },
  {
    pattern: '\\b10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b',
    replacement: '10.x.x.x',
    category: 'internal_ip',
    isRegex: true,
  },
  {
    pattern: '\\b172\\.(1[6-9]|2[0-9]|3[0-1])\\.\\d{1,3}\\.\\d{1,3}\\b',
    replacement: '172.x.x.x',
    category: 'internal_ip',
    isRegex: true,
  },
  {
    pattern: '\\b192\\.168\\.\\d{1,3}\\.\\d{1,3}\\b',
    replacement: '192.168.x.x',
    category: 'internal_ip',
    isRegex: true,
  },
  {
    pattern: '[a-zA-Z0-9._%+-]+@company\\.io',
    replacement: '[INTERNAL_USER]',
    category: 'employee',
    isRegex: true,
  },
  {
    pattern: '(sk_live_|sk_test_|api_key_|secret_)[a-zA-Z0-9]+',
    replacement: '[CREDENTIAL]',
    category: 'secret',
    isRegex: true,
  },
  {
    pattern: '(password|secret|token|key)["\'\\s]*[:=]["\'\\s]*[^"\'\\s,}]+',
    replacement: '$1=[REDACTED]',
    category: 'secret',
    isRegex: true,
  },
];

// =============================================================================
// Evidence Engine
// =============================================================================

export class EvidenceEngine {
  private readonly signingKey: string;
  private readonly verifyKey: string;

  constructor() {
    this.signingKey = process.env.EVIDENCE_SIGNING_KEY || '';
    this.verifyKey = process.env.EVIDENCE_VERIFY_KEY || '';
  }

  // ===========================================================================
  // Evidence Collection
  // ===========================================================================

  /**
   * Collect evidence for multiple controls
   */
  async collectEvidence(
    controlIds: string[],
    tenantId: string,
    dateRange?: { start: string; end: string }
  ): Promise<EvidenceSnapshot[]> {
    const span = otelService.createSpan('evidence_engine.collect');
    const allSnapshots: EvidenceSnapshot[] = [];

    try {
      for (const controlId of controlIds) {
        const control = CONTROL_MAPPINGS[controlId];
        if (!control) {
          console.warn(`Control ${controlId} not found, skipping`);
          continue;
        }

        for (const source of control.evidenceSources) {
          try {
            const snapshot = await this.collectFromSource(
              control,
              source,
              tenantId,
              dateRange
            );
            if (snapshot) {
              allSnapshots.push(snapshot);
            }
          } catch (error: any) {
            console.error(`Failed to collect from ${source.id}: ${error.message}`);
          }
        }
      }

      span?.addSpanAttributes({
        'evidence_engine.control_count': controlIds.length,
        'evidence_engine.snapshot_count': allSnapshots.length,
      });

      return allSnapshots;
    } finally {
      span?.end();
    }
  }

  /**
   * Collect from a specific evidence source
   */
  private async collectFromSource(
    control: ControlDefinition,
    source: EvidenceSource,
    tenantId: string,
    dateRange?: { start: string; end: string }
  ): Promise<EvidenceSnapshot | null> {
    const pool = getPostgresPool();
    const startDate = dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = dateRange?.end || new Date().toISOString();

    let content: any;

    switch (source.type) {
      case 'audit_log':
        if (source.config.query) {
          const { rows } = await pool.query(source.config.query, [
            tenantId,
            startDate,
            endDate,
          ]);
          content = {
            type: 'audit_log',
            source: source.name,
            recordCount: rows.length,
            dateRange: { start: startDate, end: endDate },
            records: rows.slice(0, 100), // Limit for package size
            truncated: rows.length > 100,
          };
        }
        break;

      case 'configuration':
        content = {
          type: 'configuration',
          source: source.name,
          systems: source.config.systems,
          capturedAt: new Date().toISOString(),
          note: 'Configuration evidence references - actual configs available on request',
        };
        break;

      case 'metric':
        content = {
          type: 'metric',
          source: source.name,
          query: source.config.prometheusQuery,
          threshold: source.config.threshold,
          capturedAt: new Date().toISOString(),
          note: 'Metric evidence - current values available via monitoring API',
        };
        break;

      case 'policy':
        content = {
          type: 'policy',
          source: source.name,
          policyPath: source.config.policyPath,
          verification: source.config.verification,
          capturedAt: new Date().toISOString(),
        };
        break;

      case 'external_api':
        content = {
          type: 'external_api',
          source: source.name,
          endpoint: source.config.endpoint,
          capturedAt: new Date().toISOString(),
          note: 'External API evidence - requires authenticated access',
        };
        break;

      default:
        content = {
          type: source.type,
          source: source.name,
          note: `Evidence type ${source.type} collected`,
          capturedAt: new Date().toISOString(),
        };
    }

    if (!content) return null;

    const contentStr = JSON.stringify(content);
    const snapshot: EvidenceSnapshot = {
      id: `${control.id}-${source.id}-${Date.now()}`,
      sourceId: source.id,
      controlId: control.id,
      capturedAt: new Date().toISOString(),
      capturedBy: {
        type: 'system',
        id: 'evidence-engine',
        name: 'Evidence Engine',
      },
      content,
      contentHash: createHash('sha256').update(contentStr).digest('hex'),
      contentSize: contentStr.length,
      redactionApplied: false,
    };

    return snapshot;
  }

  // ===========================================================================
  // Redaction
  // ===========================================================================

  /**
   * Apply redaction rules to evidence snapshots
   */
  applyRedaction(
    snapshots: EvidenceSnapshot[],
    tenantId: string,
    additionalRules?: RedactionRule[]
  ): EvidenceSnapshot[] {
    const rules = [...DEFAULT_REDACTION_RULES, ...(additionalRules || [])];

    return snapshots.map((snapshot) => {
      const redactedContent = this.redactContent(snapshot.content, tenantId, rules);
      const contentStr = JSON.stringify(redactedContent);

      return {
        ...snapshot,
        content: redactedContent,
        contentHash: createHash('sha256').update(contentStr).digest('hex'),
        contentSize: contentStr.length,
        redactionApplied: true,
        redactionRules: rules.map((r) => r.category),
      };
    });
  }

  /**
   * Recursively redact content
   */
  private redactContent(
    content: any,
    tenantId: string,
    rules: RedactionRule[]
  ): any {
    if (content === null || content === undefined) {
      return content;
    }

    if (typeof content === 'string') {
      return this.redactString(content, tenantId, rules);
    }

    if (Array.isArray(content)) {
      return content.map((item) => this.redactContent(item, tenantId, rules));
    }

    if (typeof content === 'object') {
      const redacted: Record<string, any> = {};
      for (const [key, value] of Object.entries(content)) {
        redacted[key] = this.redactContent(value, tenantId, rules);
      }
      return redacted;
    }

    return content;
  }

  /**
   * Redact a string value
   */
  private redactString(
    value: string,
    tenantId: string,
    rules: RedactionRule[]
  ): string {
    let redacted = value;

    for (const rule of rules) {
      if (rule.isRegex) {
        // For tenant IDs, only redact OTHER tenants
        if (rule.category === 'tenant_id') {
          const tenantSuffix = tenantId.replace('tenant_', '');
          const regex = new RegExp(`tenant_(?!${tenantSuffix})[a-zA-Z0-9]+`, 'g');
          redacted = redacted.replace(regex, rule.replacement);
        } else {
          const regex = new RegExp(rule.pattern, 'gi');
          redacted = redacted.replace(regex, rule.replacement);
        }
      } else {
        redacted = redacted.split(rule.pattern).join(rule.replacement);
      }
    }

    return redacted;
  }

  // ===========================================================================
  // Signing & Verification
  // ===========================================================================

  /**
   * Sign an evidence package
   */
  signPackage(pkg: EvidencePackage): EvidencePackage {
    if (!this.signingKey) {
      console.warn('No signing key configured, package will be unsigned');
      return pkg;
    }

    const dataToSign = JSON.stringify({
      id: pkg.id,
      requestId: pkg.requestId,
      tenantId: pkg.tenantId,
      controlIds: pkg.controlIds,
      packageHash: pkg.integrity.packageHash,
      generatedAt: pkg.metadata.generatedAt,
    });

    const sign = createSign('RSA-SHA256');
    sign.update(dataToSign);
    const signature = sign.sign(this.signingKey, 'base64');

    return {
      ...pkg,
      integrity: {
        ...pkg.integrity,
        signature: {
          algorithm: 'RSA-SHA256',
          signature,
          publicKeyId: 'evidence-signing-key-v1',
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Verify an evidence package signature
   */
  verifyPackage(pkg: EvidencePackage): boolean {
    if (!pkg.integrity.signature) {
      return false;
    }

    if (!this.verifyKey) {
      console.warn('No verify key configured, cannot verify signature');
      return false;
    }

    const dataToVerify = JSON.stringify({
      id: pkg.id,
      requestId: pkg.requestId,
      tenantId: pkg.tenantId,
      controlIds: pkg.controlIds,
      packageHash: pkg.integrity.packageHash,
      generatedAt: pkg.metadata.generatedAt,
    });

    const verify = createVerify('RSA-SHA256');
    verify.update(dataToVerify);
    return verify.verify(this.verifyKey, pkg.integrity.signature.signature, 'base64');
  }

  // ===========================================================================
  // Package Generation
  // ===========================================================================

  /**
   * Generate an evidence package for a request
   */
  async generatePackage(
    request: EvidenceRequest
  ): Promise<EvidencePackage> {
    const span = otelService.createSpan('evidence_engine.generate_package');

    try {
      // Collect evidence
      const snapshots = await this.collectEvidence(
        request.controlIds,
        request.tenantId,
        request.dateRange
      );

      // Apply redaction
      const redactedSnapshots = this.applyRedaction(snapshots, request.tenantId);

      // Calculate package hash
      const packageContent = JSON.stringify({
        snapshots: redactedSnapshots,
        metadata: {
          tenantId: request.tenantId,
          controlIds: request.controlIds,
        },
      });
      const packageHash = createHash('sha256').update(packageContent).digest('hex');

      // Create package
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      let pkg: EvidencePackage = {
        id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        requestId: request.id,
        tenantId: request.tenantId,
        controlIds: request.controlIds,
        snapshots: redactedSnapshots,
        metadata: {
          generatedAt: new Date().toISOString(),
          expiresAt,
          format: 'json',
          redactionApplied: true,
        },
        integrity: {
          packageHash,
        },
      };

      // Sign the package
      pkg = this.signPackage(pkg);

      // Store package metadata
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO evidence_packages
         (id, request_id, tenant_id, control_ids, package_hash, signature, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), $7)`,
        [
          pkg.id,
          request.id,
          request.tenantId,
          request.controlIds,
          pkg.integrity.packageHash,
          pkg.integrity.signature ? JSON.stringify(pkg.integrity.signature) : null,
          expiresAt,
        ]
      );

      span?.addSpanAttributes({
        'evidence_engine.package_id': pkg.id,
        'evidence_engine.snapshot_count': redactedSnapshots.length,
        'evidence_engine.signed': !!pkg.integrity.signature,
      });

      return pkg;
    } finally {
      span?.end();
    }
  }

  // ===========================================================================
  // Evidence Requests
  // ===========================================================================

  /**
   * Create an evidence request
   */
  async createRequest(
    tenantId: string,
    controlIds: string[],
    purpose: string,
    requestedBy: ActorReference,
    dateRange?: { start: string; end: string }
  ): Promise<EvidenceRequest> {
    const pool = getPostgresPool();

    const request: EvidenceRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      requestedBy,
      requestedAt: new Date().toISOString(),
      controlIds,
      dateRange,
      purpose,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await pool.query(
      `INSERT INTO evidence_requests
       (id, tenant_id, requested_by, control_ids, date_range, purpose, status, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8)`,
      [
        request.id,
        tenantId,
        JSON.stringify(requestedBy),
        controlIds,
        dateRange ? JSON.stringify(dateRange) : null,
        purpose,
        request.status,
        request.expiresAt,
      ]
    );

    return request;
  }

  /**
   * Process an evidence request
   */
  async processRequest(requestId: string): Promise<EvidencePackage> {
    const pool = getPostgresPool();

    // Get request
    const { rows } = await pool.query(
      'SELECT * FROM evidence_requests WHERE id = $1',
      [requestId]
    );

    if (rows.length === 0) {
      throw new Error(`Request ${requestId} not found`);
    }

    const row = rows[0];
    const request: EvidenceRequest = {
      id: row.id,
      tenantId: row.tenant_id,
      requestedBy: row.requested_by,
      requestedAt: row.created_at.toISOString(),
      controlIds: row.control_ids,
      dateRange: row.date_range,
      purpose: row.purpose,
      status: row.status,
      expiresAt: row.expires_at?.toISOString(),
    };

    // Update status to processing
    await pool.query(
      `UPDATE evidence_requests SET status = 'processing' WHERE id = $1`,
      [requestId]
    );

    try {
      // Generate package
      const pkg = await this.generatePackage(request);

      // Update request with result
      await pool.query(
        `UPDATE evidence_requests
         SET status = 'completed', processed_at = now(), package_url = $2, package_hash = $3
         WHERE id = $1`,
        [requestId, `/api/trust-center/evidence/packages/${pkg.id}`, pkg.integrity.packageHash]
      );

      return pkg;
    } catch (error: any) {
      // Update request with error
      await pool.query(
        `UPDATE evidence_requests
         SET status = 'failed', error_message = $2
         WHERE id = $1`,
        [requestId, error.message]
      );
      throw error;
    }
  }
}

// =============================================================================
// Schema Definition
// =============================================================================

export const EVIDENCE_ENGINE_SCHEMA = `
-- Evidence Packages table
CREATE TABLE IF NOT EXISTS evidence_packages (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  control_ids TEXT[] NOT NULL,
  package_hash TEXT NOT NULL,
  signature JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Evidence Requests table
CREATE TABLE IF NOT EXISTS evidence_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  requested_by JSONB NOT NULL,
  control_ids TEXT[] NOT NULL,
  date_range JSONB,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  package_url TEXT,
  package_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS evidence_packages_tenant_idx ON evidence_packages (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS evidence_packages_request_idx ON evidence_packages (request_id);
CREATE INDEX IF NOT EXISTS evidence_requests_tenant_idx ON evidence_requests (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS evidence_requests_status_idx ON evidence_requests (status, created_at DESC);
`;

// =============================================================================
// Singleton Export
// =============================================================================

export const evidenceEngine = new EvidenceEngine();
