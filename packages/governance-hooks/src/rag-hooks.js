"use strict";
/**
 * RAG Governance Hooks
 *
 * Governance controls for Retrieval-Augmented Generation operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRAGAuthorityHook = createRAGAuthorityHook;
exports.createRAGTenantIsolationHook = createRAGTenantIsolationHook;
exports.createRAGResultLimitHook = createRAGResultLimitHook;
exports.createRAGAuditHook = createRAGAuditHook;
exports.createRAGContentRedactionHook = createRAGContentRedactionHook;
exports.composeRAGHooks = composeRAGHooks;
function createRAGAuthorityHook(config) {
    const clearanceLevels = {
        UNCLASSIFIED: 0,
        CUI: 1,
        CONFIDENTIAL: 2,
        SECRET: 3,
        TOP_SECRET: 4,
    };
    return {
        async filterDocuments(query, documents) {
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
function createRAGTenantIsolationHook() {
    return {
        async beforeRetrieval(query) {
            // Ensure tenant filter is always applied
            return {
                ...query,
                filters: {
                    ...query.filters,
                    tenant_id: query.tenantId,
                },
            };
        },
        async filterDocuments(query, documents) {
            // Double-check tenant isolation
            return documents.filter((doc) => {
                const docTenant = doc.metadata.tenant_id || doc.metadata.tenantId;
                return docTenant === query.tenantId;
            });
        },
    };
}
function createRAGResultLimitHook(config) {
    return {
        async filterDocuments(query, documents) {
            return documents
                .filter((doc) => doc.score >= config.minScore)
                .slice(0, config.maxDocuments)
                .map((doc) => ({
                ...doc,
                content: doc.content.length > config.maxContentLength
                    ? `${doc.content.substring(0, config.maxContentLength)}...`
                    : doc.content,
            }));
        },
    };
}
function createRAGAuditHook(logger) {
    return {
        async afterRetrieval(query, documents) {
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
function createRAGContentRedactionHook(config) {
    return {
        async filterDocuments(query, documents) {
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
function composeRAGHooks(...hooks) {
    return {
        async beforeRetrieval(query) {
            let current = query;
            for (const hook of hooks) {
                if (hook.beforeRetrieval) {
                    current = await hook.beforeRetrieval(current);
                }
            }
            return current;
        },
        async filterDocuments(query, documents) {
            let current = documents;
            for (const hook of hooks) {
                if (hook.filterDocuments) {
                    current = await hook.filterDocuments(query, current);
                }
            }
            return current;
        },
        async afterRetrieval(query, documents) {
            for (const hook of hooks) {
                if (hook.afterRetrieval) {
                    await hook.afterRetrieval(query, documents);
                }
            }
        },
    };
}
