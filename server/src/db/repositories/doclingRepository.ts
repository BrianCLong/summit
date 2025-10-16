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
    await this.ensureSchema();
    const rows: DocFragmentRecord[] = [];
    for (const fragment of fragments) {
      const id = fragment.id || randomUUID();
      const result = await this.getPool().query(
        `INSERT INTO doc_fragments (id, tenant_id, request_id, source_type, source_uri, sha256, content_type, text, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           source_uri = EXCLUDED.source_uri,
           text = EXCLUDED.text,
           metadata = EXCLUDED.metadata
         RETURNING id, tenant_id, request_id, source_type, source_uri, sha256, content_type, text, metadata, created_at`,
        [
          id,
          tenantId,
          requestId,
          sourceType,
          sourceUri || null,
          fragment.sha256,
          fragment.contentType || 'text/plain',
          fragment.text,
          fragment.metadata || {},
        ],
      );
      rows.push({
        id: result.rows[0].id,
        tenantId,
        requestId,
        sourceType,
        sourceUri: result.rows[0].source_uri,
        sha256: result.rows[0].sha256,
        contentType: result.rows[0].content_type,
        text: result.rows[0].text,
        metadata: result.rows[0].metadata,
        createdAt: result.rows[0].created_at,
      });
    }
    return rows;
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
    await this.ensureSchema();
    const rows: DocFindingRecord[] = [];
    for (const finding of findings) {
      const id = randomUUID();
      const result = await this.getPool().query(
        `INSERT INTO doc_findings (id, tenant_id, request_id, fragment_id, label, value, confidence, severity, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, fragment_id, label, value, confidence, severity, metadata`,
        [
          id,
          tenantId,
          requestId,
          finding.fragmentId || null,
          finding.label,
          finding.value,
          finding.confidence,
          finding.severity || null,
          finding.metadata || {},
        ],
      );
      rows.push({
        id: result.rows[0].id,
        tenantId,
        requestId,
        fragmentId: result.rows[0].fragment_id,
        label: result.rows[0].label,
        value: result.rows[0].value,
        confidence: result.rows[0].confidence,
        severity: result.rows[0].severity,
        metadata: result.rows[0].metadata,
      });
    }
    return rows;
  }

  async savePolicySignals(
    tenantId: string,
    requestId: string,
    signals: PolicySignalInput[],
  ): Promise<PolicySignalRecord[]> {
    await this.ensureSchema();
    const rows: PolicySignalRecord[] = [];
    for (const signal of signals) {
      const id = randomUUID();
      const result = await this.getPool().query(
        `INSERT INTO doc_policy_signals (id, tenant_id, request_id, classification, value, purpose, retention, fragment_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, classification, value, purpose, retention, fragment_id, metadata`,
        [
          id,
          tenantId,
          requestId,
          signal.classification,
          signal.value,
          signal.purpose,
          signal.retention,
          signal.fragmentId || null,
          signal.metadata || {},
        ],
      );
      rows.push({
        id: result.rows[0].id,
        tenantId,
        requestId,
        classification: result.rows[0].classification,
        value: result.rows[0].value,
        purpose: result.rows[0].purpose,
        retention: result.rows[0].retention,
        fragmentId: result.rows[0].fragment_id,
        metadata: result.rows[0].metadata,
      });
    }
    return rows;
  }

  async saveTraceLinks(
    tenantId: string,
    requestId: string,
    links: TraceLinkInput[],
  ): Promise<TraceLinkRecord[]> {
    await this.ensureSchema();
    const rows: TraceLinkRecord[] = [];
    for (const link of links) {
      const id = randomUUID();
      const result = await this.getPool().query(
        `INSERT INTO doc_trace_links (id, tenant_id, request_id, fragment_id, target_type, target_id, relation, score, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, fragment_id, target_type, target_id, relation, score, metadata`,
        [
          id,
          tenantId,
          requestId,
          link.fragmentId,
          link.targetType,
          link.targetId,
          link.relation,
          link.score || null,
          link.metadata || {},
        ],
      );
      rows.push({
        id: result.rows[0].id,
        tenantId,
        requestId,
        fragmentId: result.rows[0].fragment_id,
        targetType: result.rows[0].target_type,
        targetId: result.rows[0].target_id,
        relation: result.rows[0].relation,
        score: result.rows[0].score,
        metadata: result.rows[0].metadata,
      });
    }
    return rows;
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
