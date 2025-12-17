import express, { Request, Response } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { getPostgresPool } from '../../config/database.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { Principal, Tenant, ApiKey } from '../../types/identity.js';
import logger from '../../utils/logger.js';
import { TenantRepository } from '../../db/tenant_repository.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();
const tenantRepo = new TenantRepository<Tenant>('tenants');
const apiKeyRepo = new TenantRepository<ApiKey>('api_keys');

// Middleware to build Principal from req.user
// This bridges the gap between old `req.user` (from AuthService) and new `Principal`
const buildPrincipal = (req: any, res: Response, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // In a real implementation, we would fetch the user's tenant memberships here.
    // For now, we construct a Principal based on available info.

    const principal: Principal = {
        kind: 'user', // Default to user
        id: req.user.id,
        tenantId: req.headers['x-tenant-id'] as string || req.user.tenantId || 'default-tenant',
        roles: [req.user.role], // Map existing role
        scopes: [], // Load scopes
        user: {
            email: req.user.email,
            username: req.user.username
        }
    };

    req.principal = principal;
    next();
};

// --- Tenants ---

// List tenants (System Admin only)
router.get('/tenants', ensureAuthenticated, buildPrincipal, async (req: any, res) => {
    try {
        await authz.assertCan(req.principal, 'administer', { type: 'system', tenantId: 'system' });

        // This is a system-level query, so we can't use TenantRepository which enforces tenantId.
        // We use raw pool for system-wide ops.
        const pool = getPostgresPool();
        const result = await pool.query('SELECT * FROM tenants ORDER BY name');
        res.json(result.rows);
    } catch (error: any) {
        if (error.message.includes('Permission denied')) {
             return res.status(403).json({ error: 'Forbidden' });
        }
        logger.error('Error listing tenants', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create Tenant
router.post('/tenants', ensureAuthenticated, buildPrincipal, async (req: any, res) => {
     try {
        // Only system admins can create tenants usually
        await authz.assertCan(req.principal, 'administer', { type: 'system', tenantId: 'system' });

        const { name, slug } = req.body;
        const pool = getPostgresPool();
        const result = await pool.query(
            'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *',
            [name, slug]
        );
        res.json(result.rows[0]);
    } catch (error: any) {
         if (error.message.includes('Permission denied')) {
             return res.status(403).json({ error: 'Forbidden' });
        }
        logger.error('Error creating tenant', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get Current Tenant
router.get('/tenants/current', ensureAuthenticated, buildPrincipal, async (req: any, res) => {
    try {
        const tenantId = req.principal.tenantId;
        const tenant = await tenantRepo.findById(tenantId, tenantId); // findById usually takes (tenantId, entityId). For tenant entity, tenantId IS the entityId.
        if (!tenant) {
             // Fallback to raw query if tenant_id vs id is confusing in repo
             const pool = getPostgresPool();
             const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
             if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
             res.json(result.rows[0]);
             return;
        }
        res.json(tenant);
    } catch (error) {
        logger.error('Error getting current tenant', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- API Keys ---

router.get('/api-keys', ensureAuthenticated, buildPrincipal, async (req: any, res) => {
    try {
        // Check if user can manage API keys in this tenant
        await authz.assertCan(req.principal, 'view', { type: 'api_key', tenantId: req.principal.tenantId });

        const keys = await apiKeyRepo.findAll(req.principal.tenantId);
        // Filter out sensitive fields if repository returns them (hashedSecret)
        const safeKeys = keys.map((k: any) => {
            const { hashedSecret, ...rest } = k;
            return rest;
        });
        res.json(safeKeys);
    } catch (error: any) {
        if (error.message.includes('Permission denied')) {
             return res.status(403).json({ error: 'Forbidden' });
        }
        logger.error('Error listing api keys', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/api-keys', ensureAuthenticated, buildPrincipal, async (req: any, res) => {
    try {
        await authz.assertCan(req.principal, 'create', { type: 'api_key', tenantId: req.principal.tenantId });

        const { label, scopes } = req.body;

        // Generate key
        const crypto = await import('crypto');
        const secret = crypto.randomBytes(32).toString('hex');
        const keyPrefix = secret.substring(0, 8);
        const hashedSecret = crypto.createHash('sha256').update(secret).digest('hex');

        // Use repo to create
        const newKey = await apiKeyRepo.create(req.principal.tenantId, {
            key_prefix: keyPrefix, // mapping snake_case because repo is generic but uses passed object keys
            hashed_secret: hashedSecret,
            label,
            scopes: scopes || [],
            created_by_user_id: req.principal.id
        } as any); // Casting because repo expects partial T but keys might differ if T is camelCase vs DB snake_case

        // Return the full secret only once
        res.json({
            ...newKey,
            secret: secret
        });
    } catch (error: any) {
        if (error.message.includes('Permission denied')) {
             return res.status(403).json({ error: 'Forbidden' });
        }
        logger.error('Error creating api key', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.delete('/api-keys/:id', ensureAuthenticated, buildPrincipal, async (req: any, res) => {
    try {
        await authz.assertCan(req.principal, 'delete', { type: 'api_key', tenantId: req.principal.tenantId });

        const { id } = req.params;
        // Soft delete (revoke) instead of hard delete
        // TenantRepository.update
        await apiKeyRepo.update(req.principal.tenantId, id, {
            revoked_at: new Date()
        } as any);

        res.json({ success: true });
    } catch (error: any) {
        if (error.message.includes('Permission denied')) {
             return res.status(403).json({ error: 'Forbidden' });
        }
        logger.error('Error revoking api key', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
