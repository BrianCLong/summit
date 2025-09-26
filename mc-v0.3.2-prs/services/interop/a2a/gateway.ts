// services/interop/a2a/gateway.ts
// MC v0.3.2 - Agent-to-Agent (A2A) Interop Gateway

import express from 'express';
import { logger } from '../../config/logger';
import { enforcePolicy, PolicyContext, PolicyAction } from '../policy-wrapper';
import { MCPClient } from '../mcp/client';
import { generateId, hashObject } from '../../utils/id-generator';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Agent registry - maps agent names to MCP endpoints
const agentRegistry = new Map<string, MCPClient>([
  ['code-refactor', new MCPClient({
    endpoint: process.env.CODE_REFACTOR_MCP_ENDPOINT || 'http://code-refactor-mcp:8080',
    timeout: 30000,
    retries: 2
  })],
  ['data-analyst', new MCPClient({
    endpoint: process.env.DATA_ANALYST_MCP_ENDPOINT || 'http://data-analyst-mcp:8080',
    timeout: 60000,
    retries: 1
  })],
  ['security-scanner', new MCPClient({
    endpoint: process.env.SECURITY_SCANNER_MCP_ENDPOINT || 'http://security-scanner-mcp:8080',
    timeout: 45000,
    retries: 2
  })]
]);

/**
 * A2A Perform - Execute agent task with comprehensive governance
 */
app.post('/a2a/perform', async (req, res) => {
  const startTime = Date.now();
  const taskId = generateId('a2a_task');

  try {
    const { tenantId, purpose, residency, pqid, agent, task } = req.body;

    // Validate required fields
    if (!tenantId || !purpose || !residency || !agent || !task) {
      return res.status(400).json({
        error: 'MISSING_REQUIRED_FIELDS',
        required: ['tenantId', 'purpose', 'residency', 'agent', 'task']
      });
    }

    // Policy enforcement
    const policyCtx: PolicyContext = {
      tenantId,
      purpose,
      residency,
      pqid,
      userId: req.body.userId,
      sessionId: req.body.sessionId
    };

    const action: PolicyAction = {
      kind: 'a2a',
      resource: agent,
      method: 'POST',
      parameters: { taskHash: hashObject(task) }
    };

    const policyResult = await enforcePolicy(policyCtx, action);
    if (!policyResult.allowed) {
      return res.status(403).json({
        error: 'POLICY_DENIED',
        reasons: policyResult.reasons,
        auditEventId: policyResult.auditEventId,
        taskId
      });
    }

    // Route to agent via MCP
    const agentClient = agentRegistry.get(agent);
    if (!agentClient) {
      return res.status(404).json({
        error: 'AGENT_NOT_FOUND',
        availableAgents: Array.from(agentRegistry.keys()),
        taskId
      });
    }

    // Execute agent task
    const agentResult = await agentClient.callTool({
      tool: 'perform-task',
      context: policyCtx,
      parameters: {
        task,
        taskId,
        constraints: policyResult.constraints
      }
    });

    if (!agentResult.success) {
      return res.status(500).json({
        error: 'AGENT_EXECUTION_FAILED',
        message: agentResult.error,
        taskId,
        auditEventId: policyResult.auditEventId
      });
    }

    // Generate provenance hash
    const result = agentResult.data;
    const provenanceHash = hashObject({
      taskId,
      tenantId,
      agent,
      task: hashObject(task),
      result: hashObject(result),
      timestamp: new Date().toISOString()
    });

    // Success response with comprehensive metadata
    const response = {
      success: true,
      taskId,
      result,
      provenance: {
        hash: provenanceHash,
        timestamp: new Date().toISOString(),
        agent,
        tenantId,
        purpose,
        auditEventId: policyResult.auditEventId
      },
      performance: {
        duration_ms: Date.now() - startTime,
        policy_check_ms: policyResult.auditEventId ? 'logged' : 'unknown'
      }
    };

    logger.info('A2A task completed successfully', {
      taskId,
      agent,
      tenantId,
      duration_ms: response.performance.duration_ms
    });

    res.json(response);

  } catch (error) {
    logger.error('A2A gateway error', {
      error: error.message,
      taskId,
      duration_ms: Date.now() - startTime
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
      taskId
    });
  }
});

/**
 * A2A Status - Check status of agent task
 */
app.get('/a2a/status/:taskId', async (req, res) => {
  try {
    // This would integrate with task tracking system
    res.json({
      taskId: req.params.taskId,
      status: 'completed', // Mock status
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/a2a/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: 'v0.3.2-mc',
    availableAgents: Array.from(agentRegistry.keys()),
    timestamp: new Date().toISOString()
  });
});

const port = process.env.A2A_GATEWAY_PORT || 8082;
app.listen(port, () => {
  logger.info(`A2A Gateway listening on port ${port}`);
});

export default app;
