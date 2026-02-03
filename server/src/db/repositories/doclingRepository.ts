import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { getPostgresPool } from '../postgres.js';

type DocFragmentRecord = {
  id: string;
  tenantId: string;
  requestId: string;
  sourceType: string;
  sourceUri?: string | null;
  sha256: string;
  contentType: string;
  text: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

type DocFragmentInput = {
  id?: string;
  sha256: string;
  contentType?: string;
  text: string;
  metadata?: Record<string, unknown>;
};

type DocSummaryRecord = {
  id: string;
  tenantId: string;
  requestId: string;
  scope: string;
  focus: string;
  text: string;
  highlights: string[];
  qualitySignals: Record<string, unknown>;
  createdAt: Date;
};

type DocFindingRecord = {
  id: string;
  tenantId: string;
  requestId: string;
  fragmentId?: string | null;
  label: string;
  value: string;
  confidence: number;
  severity?: string | null;
  metadata: Record<string, unknown>;
};

type DocFindingInput = {
  fragmentId?: string | null;
  label: string;
  value: string;
  confidence: number;
  severity?: string | null;
  metadata?: Record<string, unknown>;
};

type PolicySignalRecord = {
  id: string;
  tenantId: string;
  requestId: string;
  classification: string;
  value: string;
  purpose: string;
  retention: string;
  fragmentId?: string | null;
  metadata: Record<string, unknown>;
};

type PolicySignalInput = {
  classification: string;
  value: string;
  purpose: string;
  retention: string;
  fragmentId?: string | null;
  metadata?: Record<string, unknown>;
};

type TraceLinkRecord = {
  id: string;
  tenantId: string;
  requestId: string;
  fragmentId: string;
  targetType: string;
  targetId: string;
  relation: string;
  score?: number | null;
  metadata?: Record<string, unknown>;
};

type TraceLinkInput = {
  fragmentId: string;
  targetType: string;
  targetId: string;
  relation: string;
  score?: number | null;
  metadata?: Record<string, unknown>;
};

class DoclingRepository {
  private pool: Pool | null = null;
  private initialized = false;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = getPostgresPool();
    }
    return this.pool;
  }

  private async ensureSchema() {
    if (this.initialized) return;
    await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS doc_fragments (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_uri TEXT,
        sha256 TEXT NOT NULL,
        content_type TEXT NOT NULL,
        text TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_doc_fragments_tenant ON doc_fragments(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_doc_fragments_request ON doc_fragments(request_id);

      CREATE TABLE IF NOT EXISTS doc_summaries (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        focus TEXT NOT NULL,
        text TEXT NOT NULL,
        highlights JSONB DEFAULT '[]'::jsonb,
        quality_signals JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_doc_summaries_request ON doc_summaries(request_id);

      CREATE TABLE IF NOT EXISTS doc_findings (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        fragment_id UUID,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        confidence DOUBLE PRECISION,
        severity TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_doc_findings_request ON doc_findings(request_id);

      CREATE TABLE IF NOT EXISTS doc_policy_signals (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        classification TEXT NOT NULL,
        value TEXT,
        purpose TEXT NOT NULL,
        retention TEXT NOT NULL,
        fragment_id UUID,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS doc_trace_links (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        fragment_id UUID NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relation TEXT NOT NULL,
        score DOUBLE PRECISION,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    this.initialized = true;
  }

  async saveFragments(
    tenantId: string,
    requestId: string,
    sourceType: string,
    fragments: DocFragmentInput[],
    sourceUri?: string,
  ): Promise<DocFragmentRecord[]> {
    if (fragments.length === 0) return [];
    await this.ensureSchema();

    // BOLT: Optimized batched insertion with chunking.
    // Reduces database round-trips while staying under parameter limits.
    const chunkSize = 100;
    const allResults: DocFragmentRecord[] = [];

    for (let i = 0; i < fragments.length; i += chunkSize) {
      const chunk = fragments.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const fragment of chunk) {
        const id = fragment.id || randomUUID();
        values.push(
          id,
          tenantId,
          requestId,
          sourceType,
          sourceUri || null,
          fragment.sha256,
          fragment.contentType || 'text/plain',
          fragment.text,
          fragment.metadata || {},
        );
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`,
        );
        paramIndex += 9;
      }

      const result = await this.getPool().query(
        `INSERT INTO doc_fragments (id, tenant_id, request_id, source_type, source_uri, sha256, content_type, text, metadata)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (id) DO UPDATE SET
           source_uri = EXCLUDED.source_uri,
           text = EXCLUDED.text,
           metadata = EXCLUDED.metadata
         RETURNING id, tenant_id, request_id, source_type, source_uri, sha256, content_type, text, metadata, created_at`,
        values,
      );

      allResults.push(
        ...result.rows.map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          requestId: row.request_id,
          sourceType: row.source_type,
          sourceUri: row.source_uri,
          sha256: row.sha256,
          contentType: row.content_type,
          text: row.text,
          metadata: row.metadata,
          createdAt: row.created_at,
        })),
      );
    }

    return allResults;
  }

  async saveSummary(
    tenantId: string,
    requestId: string,
    scope: string,
    focus: string,
    text: string,
    highlights: string[],
    qualitySignals: Record<string, unknown>,
  ): Promise<DocSummaryRecord> {
    await this.ensureSchema();
    const id = randomUUID();
    const result = await this.getPool().query(
      `INSERT INTO doc_summaries (id, tenant_id, request_id, scope, focus, text, highlights, quality_signals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, request_id, scope, focus, text, highlights, quality_signals, created_at`,
      [id, tenantId, requestId, scope, focus, text, highlights, qualitySignals],
    );
    return {
      id: result.rows[0].id,
      tenantId,
      requestId,
      scope,
      focus,
      text,
      highlights,
      qualitySignals,
      createdAt: result.rows[0].created_at,
    };
  }

  async saveFindings(
    tenantId: string,
    requestId: string,
    findings: DocFindingInput[],
  ): Promise<DocFindingRecord[]> {
    if (findings.length === 0) return [];
    await this.ensureSchema();

    const chunkSize = 100;
    const allResults: DocFindingRecord[] = [];

    for (let i = 0; i < findings.length; i += chunkSize) {
      const chunk = findings.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const finding of chunk) {
        const id = randomUUID();
        values.push(
          id,
          tenantId,
          requestId,
          finding.fragmentId || null,
          finding.label,
          finding.value,
          finding.confidence,
          finding.severity || null,
          finding.metadata || {},
        );
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`,
        );
        paramIndex += 9;
      }

      const result = await this.getPool().query(
        `INSERT INTO doc_findings (id, tenant_id, request_id, fragment_id, label, value, confidence, severity, metadata)
         VALUES ${placeholders.join(', ')}
         RETURNING id, tenant_id, request_id, fragment_id, label, value, confidence, severity, metadata`,
        values,
      );

      allResults.push(
        ...result.rows.map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          requestId: row.request_id,
          fragmentId: row.fragment_id,
          label: row.label,
          value: row.value,
          confidence: row.confidence,
          severity: row.severity,
          metadata: row.metadata,
        })),
      );
    }

    return allResults;
  }

  async savePolicySignals(
    tenantId: string,
    requestId: string,
    signals: PolicySignalInput[],
  ): Promise<PolicySignalRecord[]> {
    if (signals.length === 0) return [];
    await this.ensureSchema();

    const chunkSize = 100;
    const allResults: PolicySignalRecord[] = [];

    for (let i = 0; i < signals.length; i += chunkSize) {
      const chunk = signals.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const signal of chunk) {
        const id = randomUUID();
        values.push(
          id,
          tenantId,
          requestId,
          signal.classification,
          signal.value,
          signal.purpose,
          signal.retention,
          signal.fragmentId || null,
          signal.metadata || {},
        );
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`,
        );
        paramIndex += 9;
      }

      const result = await this.getPool().query(
        `INSERT INTO doc_policy_signals (id, tenant_id, request_id, classification, value, purpose, retention, fragment_id, metadata)
         VALUES ${placeholders.join(', ')}
         RETURNING id, tenant_id, request_id, classification, value, purpose, retention, fragment_id, metadata`,
        values,
      );

      allResults.push(
        ...result.rows.map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          requestId: row.request_id,
          classification: row.classification,
          value: row.value,
          purpose: row.purpose,
          retention: row.retention,
          fragmentId: row.fragment_id,
          metadata: row.metadata,
        })),
      );
    }

    return allResults;
  }

  async saveTraceLinks(
    tenantId: string,
    requestId: string,
    links: TraceLinkInput[],
  ): Promise<TraceLinkRecord[]> {
    if (links.length === 0) return [];
    await this.ensureSchema();

    const chunkSize = 100;
    const allResults: TraceLinkRecord[] = [];

    for (let i = 0; i < links.length; i += chunkSize) {
      const chunk = links.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const link of chunk) {
        const id = randomUUID();
        values.push(
          id,
          tenantId,
          requestId,
          link.fragmentId,
          link.targetType,
          link.targetId,
          link.relation,
          link.score || null,
          link.metadata || {},
        );
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`,
        );
        paramIndex += 9;
      }

      const result = await this.getPool().query(
        `INSERT INTO doc_trace_links (id, tenant_id, request_id, fragment_id, target_type, target_id, relation, score, metadata)
         VALUES ${placeholders.join(', ')}
         RETURNING id, tenant_id, request_id, fragment_id, target_type, target_id, relation, score, metadata`,
        values,
      );

      allResults.push(
        ...result.rows.map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          requestId: row.request_id,
          fragmentId: row.fragment_id,
          targetType: row.target_type,
          targetId: row.target_id,
          relation: row.relation,
          score: row.score,
          metadata: row.metadata,
        })),
      );
    }

    return allResults;
  }

  async findSummaryByRequestId(
    tenantId: string,
    requestId: string,
  ): Promise<DocSummaryRecord | null> {
    await this.ensureSchema();
    const result = await this.getPool().query(
      `SELECT id, tenant_id, request_id, scope, focus, text, highlights, quality_signals, created_at
       FROM doc_summaries
       WHERE tenant_id = $1 AND request_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, requestId],
    );
    if (result.rows.length === 0) return null;
    return {
      id: result.rows[0].id,
      tenantId: result.rows[0].tenant_id,
      requestId: result.rows[0].request_id,
      scope: result.rows[0].scope,
      focus: result.rows[0].focus,
      text: result.rows[0].text,
      highlights: result.rows[0].highlights,
      qualitySignals: result.rows[0].quality_signals,
      createdAt: result.rows[0].created_at,
    };
  }
}

export const doclingRepository = new DoclingRepository();
