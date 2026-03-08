"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMCPHealth = checkMCPHealth;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const ws_1 = __importDefault(require("ws"));
const zod_1 = require("zod");
const MCPServersRepo_js_1 = require("./MCPServersRepo.js");
const router = express_1.default.Router();
// Basic input validation helper
function validateUrl(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'ws:' || u.protocol === 'wss:';
    }
    catch {
        return false;
    }
}
const ServerSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(3)
        .max(64)
        .regex(/^[a-zA-Z0-9_.:-]+$/),
    url: zod_1.z.string().url(),
    authToken: zod_1.z.string().min(1).max(4096).optional(),
    scopes: zod_1.z.array(zod_1.z.string().min(1).max(64)).max(64).optional(),
    tags: zod_1.z.array(zod_1.z.string().min(1).max(32)).max(64).optional(),
    fingerprintSha256: zod_1.z
        .string()
        .regex(/^[A-Fa-f0-9:]{59,95}$/)
        .optional(),
});
function isHostAllowed(url) {
    const allow = process.env.MCP_ALLOWED_HOSTS?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) || [];
    if (allow.length === 0)
        return true; // if not set, allow any (dev)
    try {
        const u = new URL(url);
        return allow.includes(u.hostname);
    }
    catch {
        return false;
    }
}
router.use(express_1.default.json());
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
        return res.status(400).json({
            error: 'host_not_allowed',
            message: 'URL host not in MCP_ALLOWED_HOSTS',
        });
    }
    try {
        const created = await MCPServersRepo_js_1.mcpServersRepo.create({
            name,
            url,
            authToken,
            scopes,
            tags,
            fingerprintSha256,
        });
        // Never return auth_token in API responses
        const { auth_token, ...safe } = created;
        return res.status(201).json({ ...safe });
    }
    catch (err) {
        if (err?.message?.includes('duplicate key value violates unique constraint')) {
            return res.status(409).json({ error: 'server name already exists' });
        }
        console.error('Failed to create MCP server:', err);
        return res.status(500).json({ error: 'failed to create server' });
    }
});
// GET /api/maestro/v1/mcp/servers
router.get('/servers', async (_req, res) => {
    try {
        const list = await MCPServersRepo_js_1.mcpServersRepo.list();
        const safe = list.map(({ auth_token, ...rest }) => rest);
        res.json(safe);
    }
    catch (err) {
        console.error('Failed to list MCP servers:', err);
        res.status(500).json({ error: 'failed to list servers' });
    }
});
// GET /api/maestro/v1/mcp/servers/:id
router.get('/servers/:id', async (req, res) => {
    try {
        const rec = await MCPServersRepo_js_1.mcpServersRepo.get(req.params.id);
        if (!rec)
            return res.status(404).json({ error: 'server not found' });
        const { auth_token, ...safe } = rec;
        res.json(safe);
    }
    catch (err) {
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
    const { name, url, authToken, scopes, tags, fingerprintSha256 } = parse.data;
    if (url !== undefined && !validateUrl(url)) {
        return res
            .status(400)
            .json({ error: 'url must be ws:// or wss:// WebSocket endpoint' });
    }
    if (url && !isHostAllowed(url)) {
        return res.status(400).json({
            error: 'host_not_allowed',
            message: 'URL host not in MCP_ALLOWED_HOSTS',
        });
    }
    try {
        const updated = await MCPServersRepo_js_1.mcpServersRepo.update(req.params.id, {
            name,
            url,
            authToken,
            scopes,
            tags,
            fingerprintSha256,
        });
        if (!updated)
            return res.status(404).json({ error: 'server not found' });
        const { auth_token, ...safe } = updated;
        res.json(safe);
    }
    catch (err) {
        console.error('Failed to update MCP server:', err);
        res.status(500).json({ error: 'failed to update server' });
    }
});
// DELETE /api/maestro/v1/mcp/servers/:id
router.delete('/servers/:id', requireAdminMCP, async (req, res) => {
    try {
        const ok = await MCPServersRepo_js_1.mcpServersRepo.delete(req.params.id);
        if (!ok)
            return res.status(404).json({ error: 'server not found' });
        res.status(204).send();
    }
    catch (err) {
        console.error('Failed to delete MCP server:', err);
        res.status(500).json({ error: 'failed to delete server' });
    }
});
// GET /api/maestro/v1/mcp/servers/:id/health
router.get('/servers/:id/health', async (req, res) => {
    try {
        const rec = await MCPServersRepo_js_1.mcpServersRepo.get(req.params.id);
        if (!rec)
            return res.status(404).json({ error: 'server not found' });
        const healthy = await checkMCPHealth(rec.url, rec.auth_token || undefined);
        res.json({ id: rec.id, name: rec.name, url: rec.url, healthy });
    }
    catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({ error: 'health check failed' });
    }
});
// Alias to satisfy contract: GET /mcp/servers/:id/health
router.get('/health-alias/:id', (_req, res) => res.status(501).json({ error: 'not implemented' }));
async function checkMCPHealth(url, authToken, fingerprintSha256) {
    return new Promise((resolve) => {
        const headers = {};
        if (authToken)
            headers['Authorization'] = `Bearer ${authToken}`;
        const ws = new ws_1.default(url, { headers, rejectUnauthorized: true });
        let resolved = false;
        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                try {
                    ws.terminate();
                }
                catch { }
                resolve(false);
            }
        }, 3000);
        ws.on('open', () => {
            try {
                if (fingerprintSha256) {
                    const anyWs = ws;
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
                            }
                            catch { }
                            return resolve(false);
                        }
                    }
                }
            }
            catch {
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
                        }
                        catch { }
                        resolve(true);
                    }
                }
            }
            catch {
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
exports.default = router;
// Require admin:mcp permission (or ADMIN role in dev)
function requireAdminMCP(req, res, next) {
    const user = req.user || {};
    const hasAdminRole = Array.isArray(user.roles)
        ? user.roles.includes('ADMIN')
        : user.role === 'ADMIN' || user.role === 'admin';
    const hasAdminPerm = Array.isArray(user.permissions) && user.permissions.includes('admin:mcp');
    if (hasAdminPerm || hasAdminRole)
        return next();
    return res
        .status(403)
        .json({ error: 'forbidden', message: 'admin:mcp required' });
}
