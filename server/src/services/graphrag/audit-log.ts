/**
 * GraphRAG Audit Log
 * Records all GraphRAG interactions for compliance and forensics
 */

import crypto from 'crypto';
import { query as timescaleQuery } from '../../db/timescale.js';
import logger from '../../utils/logger.js';
import { GraphRagAuditLog, GraphRagAuditRecord } from './types.js';

/**
 * PostgreSQL/TimescaleDB implementation of audit log
 */
export class PostgresGraphRagAuditLog implements GraphRagAuditLog {
  async append(record: GraphRagAuditRecord): Promise<void> {
    try {
      await timescaleQuery(
        `
        INSERT INTO graphrag_audit_log (
          id, timestamp, user_id, case_id, question,
          context_num_nodes, context_num_edges, context_num_evidence,
          answer_has_answer, answer_num_citations, answer_num_unknowns,
          policy_filtered_count, policy_allowed_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
        [
          record.id,
          record.timestamp,
          record.userId,
          record.caseId,
          record.question,
          record.contextSummary.numNodes,
          record.contextSummary.numEdges,
          record.contextSummary.numEvidenceSnippets,
          record.answerSummary.hasAnswer,
          record.answerSummary.numCitations,
          record.answerSummary.numUnknowns,
          record.policyDecisions?.filteredEvidenceCount ?? 0,
          record.policyDecisions?.allowedEvidenceCount ?? 0,
        ],
      );

      logger.debug({
        message: 'GraphRAG audit record appended',
        auditId: record.id,
        userId: record.userId,
        caseId: record.caseId,
      });
    } catch (error) {
      // Log error but don't fail the request
      logger.error({
        message: 'Failed to append GraphRAG audit record',
        auditId: record.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getByUser(userId: string, limit: number = 100): Promise<GraphRagAuditRecord[]> {
    try {
      const result = await timescaleQuery(
        `
        SELECT * FROM graphrag_audit_log
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `,
        [userId, limit],
      );

      return result.rows.map(this.rowToRecord);
    } catch (error) {
      logger.error({
        message: 'Failed to get audit records by user',
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async getByCase(caseId: string, limit: number = 100): Promise<GraphRagAuditRecord[]> {
    try {
      const result = await timescaleQuery(
        `
        SELECT * FROM graphrag_audit_log
        WHERE case_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `,
        [caseId, limit],
      );

      return result.rows.map(this.rowToRecord);
    } catch (error) {
      logger.error({
        message: 'Failed to get audit records by case',
        caseId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private rowToRecord(row: any): GraphRagAuditRecord {
    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      caseId: row.case_id,
      question: row.question,
      contextSummary: {
        numNodes: row.context_num_nodes,
        numEdges: row.context_num_edges,
        numEvidenceSnippets: row.context_num_evidence,
      },
      answerSummary: {
        hasAnswer: row.answer_has_answer,
        numCitations: row.answer_num_citations,
        numUnknowns: row.answer_num_unknowns,
      },
      policyDecisions: {
        filteredEvidenceCount: row.policy_filtered_count,
        allowedEvidenceCount: row.policy_allowed_count,
      },
    };
  }
}

/**
 * In-memory audit log for testing
 */
export class InMemoryGraphRagAuditLog implements GraphRagAuditLog {
  private records: GraphRagAuditRecord[] = [];

  async append(record: GraphRagAuditRecord): Promise<void> {
    this.records.push(record);
  }

  async getByUser(userId: string, limit: number = 100): Promise<GraphRagAuditRecord[]> {
    return this.records
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getByCase(caseId: string, limit: number = 100): Promise<GraphRagAuditRecord[]> {
    return this.records
      .filter((r) => r.caseId === caseId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getAll(): GraphRagAuditRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}

/**
 * Create audit record from request/response data
 */
export function createAuditRecord(params: {
  userId: string;
  caseId: string;
  question: string;
  contextSummary: {
    numNodes: number;
    numEdges: number;
    numEvidenceSnippets: number;
  };
  answerSummary: {
    hasAnswer: boolean;
    numCitations: number;
    numUnknowns: number;
  };
  policyDecisions?: {
    filteredEvidenceCount: number;
    allowedEvidenceCount: number;
  };
}): GraphRagAuditRecord {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: params.userId,
    caseId: params.caseId,
    question: params.question,
    contextSummary: params.contextSummary,
    answerSummary: params.answerSummary,
    policyDecisions: params.policyDecisions,
  };
}

/**
 * SQL schema for audit log table
 */
export const GRAPHRAG_AUDIT_SCHEMA = `
-- GraphRAG Audit Log Schema
-- Tracks all GraphRAG queries for compliance and forensics

CREATE TABLE IF NOT EXISTS graphrag_audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  question TEXT NOT NULL,

  -- Context summary (avoid storing full context for privacy)
  context_num_nodes INT NOT NULL DEFAULT 0,
  context_num_edges INT NOT NULL DEFAULT 0,
  context_num_evidence INT NOT NULL DEFAULT 0,

  -- Answer summary
  answer_has_answer BOOLEAN NOT NULL DEFAULT false,
  answer_num_citations INT NOT NULL DEFAULT 0,
  answer_num_unknowns INT NOT NULL DEFAULT 0,

  -- Policy decisions
  policy_filtered_count INT NOT NULL DEFAULT 0,
  policy_allowed_count INT NOT NULL DEFAULT 0
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS graphrag_audit_user_time_idx
  ON graphrag_audit_log (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS graphrag_audit_case_time_idx
  ON graphrag_audit_log (case_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS graphrag_audit_time_idx
  ON graphrag_audit_log (timestamp DESC);

-- Convert to hypertable for TimescaleDB (if available)
-- SELECT create_hypertable('graphrag_audit_log', 'timestamp', if_not_exists => TRUE);
`;

export function createAuditLog(): GraphRagAuditLog {
  if (process.env.NODE_ENV === 'test') {
    return new InMemoryGraphRagAuditLog();
  }
  return new PostgresGraphRagAuditLog();
}
