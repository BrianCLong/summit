import express from 'express';
import WebSocket from 'ws';
import { z } from 'zod';
import { mcpServersRepo } from './MCPServersRepo.js';

const router = express.Router();

// Basic input validation helper
function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'ws:' || u.protocol === 'wss:';
  } catch {
    return false;
  }
}

const ServerSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_.:-]+$/),
  url: z.string().url(),
  authToken: z.string().min(1).max(4096).optional(),
  scopes: z.array(z.string().min(1).max(64)).max(64).optional(),
  tags: z.array(z.string().min(1).max(32)).max(64).optional(),
  fingerprintSha256: z
    .string()
    .regex(/^[A-Fa-f0-9:]{59,95}$/)
    .optional(),
});

function isHostAllowed(url: string): boolean {
  const allow =
    process.env.MCP_ALLOWED_HOSTS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) || [];
  if (allow.length === 0) return true; // if not set, allow any (dev)
  try {
    const u = new URL(url);
    return allow.includes(u.hostname);
  } catch {
    return false;
  }
}

router.use(express.json());

// POST /api/maestro/v1/mcp/servers
router.post('/servers', requireAdminMCP, async (req, res) => {
  const parse = ServerSchema.safeParse(req.body || {});
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'invalid_input', details: parse.error.issues });
  }
  const { name, url, authToken, scopes, tags, fingerprintSha256 } = parse.data;
  if (!validateUrl(url)) {
    return res
      .status(400)
      .json({ error: 'url must be ws:// or wss:// WebSocket endpoint' });
  }
  if (!isHostAllowed(url)) {
    return res
      .status(400)
      .json({
        error: 'host_not_allowed',
        message: 'URL host not in MCP_ALLOWED_HOSTS',
      });
  }
  try {
    const created = await mcpServersRepo.create({
      name,
      url,
      authToken,
      scopes,
      tags,
      fingerprintSha256,
    } as any);
    // Never return auth_token in API responses
    const { auth_token, ...safe } = created as any;
    return res.status(201).json({ ...safe });
  } catch (err: any) {
    if (
      err?.message?.includes('duplicate key value violates unique constraint')
    ) {
      return res.status(409).json({ error: 'server name already exists' });
    }
    console.error('Failed to create MCP server:', err);
    return res.status(500).json({ error: 'failed to create server' });
  }
});

// GET /api/maestro/v1/mcp/servers
router.get('/servers', async (_req, res) => {
  try {
    const list = await mcpServersRepo.list();
    const safe = list.map(({ auth_token, ...rest }) => rest);
    res.json(safe);
  } catch (err) {
    console.error('Failed to list MCP servers:', err);
    res.status(500).json({ error: 'failed to list servers' });
  }
});

// GET /api/maestro/v1/mcp/servers/:id
router.get('/servers/:id', async (req, res) => {
  try {
    const rec = await mcpServersRepo.get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'server not found' });
    const { auth_token, ...safe } = rec as any;
    res.json(safe);
  } catch (err) {
    console.error('Failed to get MCP server:', err);
    res.status(500).json({ error: 'failed to get server' });
  }
});

// PUT /api/maestro/v1/mcp/servers/:id
router.put('/servers/:id', requireAdminMCP, async (req, res) => {
  const parse = ServerSchema.partial().safeParse(req.body || {});
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'invalid_input', details: parse.error.issues });
  }
  const { name, url, authToken, scopes, tags, fingerprintSha256 } =
    parse.data as any;
  if (url !== undefined && !validateUrl(url)) {
    return res
      .status(400)
      .json({ error: 'url must be ws:// or wss:// WebSocket endpoint' });
  }
  if (url && !isHostAllowed(url)) {
    return res
      .status(400)
      .json({
        error: 'host_not_allowed',
        message: 'URL host not in MCP_ALLOWED_HOSTS',
      });
  }
  try {
    const updated = await mcpServersRepo.update(req.params.id, {
      name,
      url,
      authToken,
      scopes,
      tags,
      fingerprintSha256,
    });
    if (!updated) return res.status(404).json({ error: 'server not found' });
    const { auth_token, ...safe } = updated as any;
    res.json(safe);
  } catch (err: any) {
    console.error('Failed to update MCP server:', err);
    res.status(500).json({ error: 'failed to update server' });
  }
});

// DELETE /api/maestro/v1/mcp/servers/:id
router.delete('/servers/:id', requireAdminMCP, async (req, res) => {
  try {
    const ok = await mcpServersRepo.delete(req.params.id);
    if (!ok) return res.status(404).json({ error: 'server not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Failed to delete MCP server:', err);
    res.status(500).json({ error: 'failed to delete server' });
  }
});

// GET /api/maestro/v1/mcp/servers/:id/health
router.get('/servers/:id/health', async (req, res) => {
  try {
    const rec = await mcpServersRepo.get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'server not found' });
    const healthy = await checkMCPHealth(rec.url, rec.auth_token || undefined);
    res.json({ id: rec.id, name: rec.name, url: rec.url, healthy });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ error: 'health check failed' });
  }
});

// Alias to satisfy contract: GET /mcp/servers/:id/health
router.get('/health-alias/:id', (_req, res) =>
  res.status(501).json({ error: 'not implemented' }),
);

export async function checkMCPHealth(
  url: string,
  authToken?: string,
  fingerprintSha256?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const ws = new WebSocket(url, { headers, rejectUnauthorized: true });
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          ws.terminate();
        } catch {}
        resolve(false);
      }
    }, 3000);

    ws.on('open', () => {
      try {
        if (fingerprintSha256) {
          const anyWs: any = ws as any;
          const cert = anyWs?._socket?.getPeerCertificate?.(true);
          if (cert && cert.fingerprint256) {
            const fp = String(cert.fingerprint256)
              .replace(/\s+/g, '')
              .toUpperCase();
            const want = fingerprintSha256.replace(/\s+/g, '').toUpperCase();
            if (fp !== want) {
              clearTimeout(timer);
              resolved = true;
              try {
                ws.close();
              } catch {}
              return resolve(false);
            }
          }
        }
      } catch {
        // proceed anyway
      }
      // Send a simple server/info call per MCP protocol
      const msg = JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'server/info',
      });
      ws.send(msg);
    });
    ws.on('message', (data) => {
      // Any valid JSON-RPC response qualifies as healthy
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed && parsed.jsonrpc === '2.0' && parsed.id) {
          clearTimeout(timer);
          if (!resolved) {
            resolved = true;
            try {
              ws.close();
            } catch {}
            resolve(true);
          }
        }
      } catch {
        // ignore
      }
    });
    ws.on('error', () => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });
    ws.on('close', () => {
      // if close happens before response, treat as unhealthy
      if (!resolved) {
        clearTimeout(timer);
        resolved = true;
        resolve(false);
      }
    });
  });
}

export default router;
// Require admin:mcp permission (or ADMIN role in dev)
function requireAdminMCP(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const user: any = (req as any).user || {};
  const hasAdminRole = Array.isArray(user.roles)
    ? user.roles.includes('ADMIN')
    : user.role === 'ADMIN' || user.role === 'admin';
  const hasAdminPerm =
    Array.isArray(user.permissions) && user.permissions.includes('admin:mcp');
  if (hasAdminPerm || hasAdminRole) return next();
  return res
    .status(403)
    .json({ error: 'forbidden', message: 'admin:mcp required' });
}
