/**
 * Proxy routes to backend services
 * Forwards authenticated and authorized requests to mesh services
 */

import { Router } from 'express';

export const proxyRouter = Router();

// Service routing map
const serviceMap: Record<string, string> = {
  orchestrator: process.env.ORCHESTRATOR_URL || 'http://mesh-orchestrator.mesh-control:8080',
  routing: process.env.ROUTING_URL || 'http://routing-gateway.mesh-control:8082',
  policy: process.env.POLICY_URL || 'http://policy-enforcer.mesh-control:8081',
  'agent-registry': process.env.AGENT_REGISTRY_URL || 'http://agent-registry.mesh-control:8083',
  'tool-registry': process.env.TOOL_REGISTRY_URL || 'http://tool-registry.mesh-control:8083',
  'tenant-registry': process.env.TENANT_REGISTRY_URL || 'http://tenant-registry.mesh-control:8083',
  eval: process.env.MESH_EVAL_URL || 'http://mesh-eval.mesh-control:8084',
  console: process.env.CONSOLE_API_URL || 'http://mesh-operator-console-api.mesh-ops:8090'
};

// Proxy requests to backend services
proxyRouter.all('/:service/*', async (req, res) => {
  const { service } = req.params;
  const path = req.params[0];

  const targetUrl = serviceMap[service];

  if (!targetUrl) {
    res.status(404).json({
      error: 'Service not found',
      message: `Unknown service: ${service}`
    });
    return;
  }

  try {
    // Forward request to backend service
    const authContext = (req as any).authContext;

    const response = await fetch(`${targetUrl}/${path}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Context': JSON.stringify(authContext),
        'X-Tenant-ID': authContext?.tenant?.tenantId || '',
        'X-User-ID': authContext?.attributes?.userId || ''
      },
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined
    });

    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({
      error: 'Proxy error',
      message: error instanceof Error ? error.message : 'Failed to proxy request'
    });
  }
});
