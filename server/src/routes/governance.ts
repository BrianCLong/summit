import express from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { agentRegistry } from '../governance/agent-registry.js';
import { RequestContext } from '../middleware/context-binding.js';

const router = express.Router();

const CreateAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  complianceTags: z.array(z.string()).optional(),
});

const UpdateAgentSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'REVOKED', 'DEPRECATED']).optional(),
  capabilities: z.array(z.string()).optional(),
  complianceTags: z.array(z.string()).optional(),
});

const CreatePolicySchema = z.object({
  name: z.string(),
  policyType: z.enum(['OPA_REGO', 'MANUAL_APPROVAL', 'THRESHOLD']),
  configuration: z.record(z.any()),
  isBlocking: z.boolean().default(true),
});

// Create Agent (The "Passport")
router.post('/agents', ensureAuthenticated, requirePermission('agent:create'), async (req, res) => {
  try {
    const data = CreateAgentSchema.parse(req.body);
    const tenantId = (req.context as RequestContext).tenantId;
    const userId = (req as any).user?.id;

    const agent = await agentRegistry.createAgent({
      ...data,
      tenantId,
      ownerId: userId,
    });
    res.status(201).json(agent);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create agent' });
  }
});

// List Agents
router.get('/agents', ensureAuthenticated, requirePermission('agent:read'), async (req, res) => {
    try {
        const tenantId = (req.context as RequestContext).tenantId;
        const agents = await agentRegistry.listAgents(tenantId);
        res.json(agents);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list agents' });
    }
});

// Update Agent
router.put('/agents/:id', ensureAuthenticated, requirePermission('agent:update'), async (req, res) => {
    try {
        const data = UpdateAgentSchema.parse(req.body);
        const tenantId = (req.context as RequestContext).tenantId;
        const agent = await agentRegistry.updateAgent(req.params.id, tenantId, data);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });
        res.json(agent);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update agent' });
    }
});

// Add Policy to Agent
router.post('/agents/:id/policies', ensureAuthenticated, requirePermission('agent:admin'), async (req, res) => {
    try {
        const data = CreatePolicySchema.parse(req.body);
        // Verify agent exists and belongs to tenant
        const tenantId = (req.context as RequestContext).tenantId;
        const agent = await agentRegistry.getAgent(req.params.id, tenantId);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        const policy = await agentRegistry.addPolicy(req.params.id, data);
        res.status(201).json(policy);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add policy' });
    }
});

export default router;
