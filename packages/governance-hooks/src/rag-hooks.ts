/**
 * RAG Governance Hooks
 *
 * Governance controls for Retrieval-Augmented Generation operations.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RAGQuery {
  query: string;
  userId: string;
  tenantId: string;
  investigationId?: string;
  filters?: Record<string, unknown>;
  topK?: number;
}

export interface RAGDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
  classification?: string;
  compartments?: string[];
}

export interface RAGHook {
  /** Called before retrieval */
  beforeRetrieval?: (query: RAGQuery) => Promise<RAGQuery>;
  /** Called to filter retrieved documents */
  filterDocuments?: (query: RAGQuery, documents: RAGDocument[]) => Promise<RAGDocument[]>;
  /** Called after retrieval */
  afterRetrieval?: (query: RAGQuery, documents: RAGDocument[]) => Promise<void>;
}

// -----------------------------------------------------------------------------
// Authority Filter Hook
// -----------------------------------------------------------------------------

export interface AuthorityFilterConfig {
  /** User clearance getter */
  getUserClearance: (userId: string) => Promise<string>;
  /** User compartments getter */
  getUserCompartments: (userId: string) => Promise<string[]>;
}

export function createRAGAuthorityHook(config: AuthorityFilterConfig): RAGHook {
  const clearanceLevels: Record<string, number> = {
    UNCLASSIFIED: 0,
    CUI: 1,
    CONFIDENTIAL: 2,
    SECRET: 3,
    TOP_SECRET: 4,
  };

  return {
    async filterDocuments(query: RAGQuery, documents: RAGDocument[]) {
      const userClearance = await config.getUserClearance(query.userId);
      const userCompartments = await config.getUserCompartments(query.userId);
      const userClearanceLevel = clearanceLevels[userClearance] || 0;

      return documents.filter((doc) => {
        // Check classification
        const docClassification = doc.classification || 'UNCLASSIFIED';
        const docLevel = clearanceLevels[docClassification] || 0;

        if (docLevel > userClearanceLevel) {
          return false;
        }

        // Check compartments
        if (doc.compartments && doc.compartments.length > 0) {
          const hasCompartment = doc.compartments.some((c) => userCompartments.includes(c));
          if (!hasCompartment) {
            return false;
          }
        }

        return true;
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Tenant Isolation Hook
// -----------------------------------------------------------------------------

export function createRAGTenantIsolationHook(): RAGHook {
  return {
    async beforeRetrieval(query: RAGQuery) {
      // Ensure tenant filter is always applied
      return {
        ...query,
        filters: {
          ...query.filters,
          tenant_id: query.tenantId,
        },
      };
    },

    async filterDocuments(query: RAGQuery, documents: RAGDocument[]) {
      // Double-check tenant isolation
      return documents.filter((doc) => {
        const docTenant = doc.metadata.tenant_id || doc.metadata.tenantId;
        return docTenant === query.tenantId;
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Result Limiting Hook
// -----------------------------------------------------------------------------

export interface ResultLimitConfig {
  /** Maximum documents to return */
  maxDocuments: number;
  /** Minimum score threshold */
  minScore: number;
  /** Maximum content length per document */
  maxContentLength: number;
}

export function createRAGResultLimitHook(config: ResultLimitConfig): RAGHook {
  return {
    async filterDocuments(query: RAGQuery, documents: RAGDocument[]) {
      return documents
        .filter((doc) => doc.score >= config.minScore)
        .slice(0, config.maxDocuments)
        .map((doc) => ({
          ...doc,
          content: doc.content.length > config.maxContentLength
            ? doc.content.substring(0, config.maxContentLength) + '...'
            : doc.content,
        }));
    },
  };
}

// -----------------------------------------------------------------------------
// Audit Hook
// -----------------------------------------------------------------------------

export interface RAGAuditLogger {
  log(event: RAGAuditEvent): Promise<void>;
}

export interface RAGAuditEvent {
  eventType: 'rag_query' | 'rag_retrieval';
  userId: string;
  tenantId: string;
  investigationId?: string;
  query: string;
  documentCount: number;
  documentIds: string[];
  timestamp: Date;
}

export function createRAGAuditHook(logger: RAGAuditLogger): RAGHook {
  return {
    async afterRetrieval(query: RAGQuery, documents: RAGDocument[]) {
      await logger.log({
        eventType: 'rag_retrieval',
        userId: query.userId,
        tenantId: query.tenantId,
        investigationId: query.investigationId,
        query: query.query.substring(0, 200), // Truncate for storage
        documentCount: documents.length,
        documentIds: documents.map((d) => d.id),
        timestamp: new Date(),
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Content Redaction Hook
// -----------------------------------------------------------------------------

export interface ContentRedactionConfig {
  patterns: Array<{
    name: string;
    regex: RegExp;
    replacement: string;
  }>;
}

export function createRAGContentRedactionHook(config: ContentRedactionConfig): RAGHook {
  return {
    async filterDocuments(query: RAGQuery, documents: RAGDocument[]) {
      return documents.map((doc) => {
        let redactedContent = doc.content;

        for (const pattern of config.patterns) {
          redactedContent = redactedContent.replace(pattern.regex, pattern.replacement);
        }

        return {
          ...doc,
          content: redactedContent,
        };
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Composite Hook
// -----------------------------------------------------------------------------

export function composeRAGHooks(...hooks: RAGHook[]): RAGHook {
  return {
    async beforeRetrieval(query: RAGQuery) {
      let current = query;

      for (const hook of hooks) {
        if (hook.beforeRetrieval) {
          current = await hook.beforeRetrieval(current);
        }
      }

      return current;
    },

    async filterDocuments(query: RAGQuery, documents: RAGDocument[]) {
      let current = documents;

      for (const hook of hooks) {
        if (hook.filterDocuments) {
          current = await hook.filterDocuments(query, current);
        }
      }

      return current;
    },

    async afterRetrieval(query: RAGQuery, documents: RAGDocument[]) {
      for (const hook of hooks) {
        if (hook.afterRetrieval) {
          await hook.afterRetrieval(query, documents);
        }
      }
    },
  };
}
