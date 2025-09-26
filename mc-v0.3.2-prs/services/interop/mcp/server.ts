// services/interop/mcp/server.ts
// MC v0.3.2 - MCP (Model Context Protocol) Server Implementation

import express from 'express';
import { logger } from '../../config/logger';
import { enforcePolicy, PolicyContext, PolicyAction } from '../policy-wrapper';
import { runPersistedGraphQuery } from '../../graphql/persisted-executor';
import { searchEntities } from '../../services/entity-search';

const app = express();
app.use(express.json({ limit: '10mb' }));

// MCP Protocol Implementation
// Exposes MC Platform capabilities through standardized MCP interface

/**
 * MCP Tool: graph.query
 * Execute persisted GraphQL query with policy enforcement
 */
app.post('/mcp/tools/graph.query', async (req, res) => {
  try {
    const { context, parameters } = req.body;

    // Validate MCP context
    const policyCtx: PolicyContext = {
      tenantId: context.tenantId,
      purpose: context.purpose,
      residency: context.residency,
      pqid: parameters.pqid,
      userId: context.userId,
      sessionId: context.sessionId
    };

    const action: PolicyAction = {
      kind: 'tool',
      resource: 'graph.query',
      method: 'POST',
      parameters: { pqid: parameters.pqid }
    };

    // Enforce policy
    const policyResult = await enforcePolicy(policyCtx, action);
    if (!policyResult.allowed) {
      return res.status(403).json({
        error: 'POLICY_DENIED',
        reasons: policyResult.reasons,
        auditEventId: policyResult.auditEventId
      });
    }

    // Execute persisted query
    const queryResult = await runPersistedGraphQuery(
      context.tenantId,
      parameters.pqid,
      parameters.variables || {}
    );

    res.json({
      success: true,
      data: queryResult.data,
      errors: queryResult.errors,
      extensions: {
        auditEventId: policyResult.auditEventId,
        executionTime: queryResult.executionTime,
        cacheHit: queryResult.cacheHit
      }
    });

  } catch (error) {
    logger.error('MCP graph.query error', { error: error.message });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

/**
 * MCP Tool: entity.search
 * Search entities with privacy-aware results
 */
app.post('/mcp/tools/entity.search', async (req, res) => {
  try {
    const { context, parameters } = req.body;

    const policyCtx: PolicyContext = {
      tenantId: context.tenantId,
      purpose: context.purpose,
      residency: context.residency,
      userId: context.userId,
      sessionId: context.sessionId
    };

    const action: PolicyAction = {
      kind: 'tool',
      resource: 'entity.search',
      method: 'POST',
      parameters: parameters
    };

    const policyResult = await enforcePolicy(policyCtx, action);
    if (!policyResult.allowed) {
      return res.status(403).json({
        error: 'POLICY_DENIED',
        reasons: policyResult.reasons,
        auditEventId: policyResult.auditEventId
      });
    }

    // Execute entity search
    const searchResult = await searchEntities({
      tenantId: context.tenantId,
      query: parameters.query,
      filters: parameters.filters,
      limit: Math.min(parameters.limit || 50, 200), // Cap at 200
      purpose: context.purpose
    });

    res.json({
      success: true,
      entities: searchResult.entities,
      total: searchResult.total,
      hasMore: searchResult.hasMore,
      extensions: {
        auditEventId: policyResult.auditEventId,
        privacyApplied: searchResult.privacyApplied,
        riskScore: searchResult.riskScore
      }
    });

  } catch (error) {
    logger.error('MCP entity.search error', { error: error.message });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// Health check
app.get('/mcp/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: 'v0.3.2-mc',
    timestamp: new Date().toISOString()
  });
});

const port = process.env.MCP_SERVER_PORT || 8081;
app.listen(port, () => {
  logger.info(`MCP Server listening on port ${port}`);
});

export default app;
