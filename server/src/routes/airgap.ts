import { ensureAuthenticated as authenticateToken } from '../middleware/auth.js';
import { AuthorizationServiceImpl } from '../services/AuthorizationService.js';
import { Principal } from '../types/identity.js';
import { Router } from 'express';
import { AirgapService } from '../services/AirgapService.js';
import { tenantHeader } from '../middleware/tenantHeader.js';
import { getNeo4jDriver } from '../config/database.js';
import { writeFile, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import express from 'express';

export const airgapRouter = Router();
const service = new AirgapService();
const authService = new AuthorizationServiceImpl();

// Middleware to ensure tenant context
airgapRouter.use(tenantHeader());
airgapRouter.use(authenticateToken);

// Export Route
airgapRouter.post('/export', async (req: any, res) => {
    let session;
    try {
        const tenantId = req.tenantId;
        session = getNeo4jDriver().session();
        const request = {
            ...req.body,
            tenantId,
            userId: req.user?.id || 'unknown'
        };
        const user = (req as any).user; // Cast to any as req.user might not be typed
        if (!user) throw new Error('Unauthenticated');

        const principal: Principal = {
            id: user.id,
            kind: 'user',
            tenantId: tenantId,
            roles: [user.role],
            user: { email: user.email, username: user.username }
        };

        await authService.assertCan(principal, 'create', { type: 'data_export', tenantId });


        const result = await service.exportBundle(request, session);
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    } finally {
        if (session) await session.close();
    }
});

// Import Route - streams body to file
airgapRouter.post('/import', async (req: any, res) => {
    const tenantId = req.tenantId;
    const tempFile = join('/tmp', `import-${randomUUID()}.zip`);

    try {
        const writeStream = createWriteStream(tempFile);
        await new Promise<void>((resolve, reject) => {
             req.pipe(writeStream);
             writeStream.on('finish', () => resolve());
             writeStream.on('error', reject);
             req.on('error', reject);
        });

        const result = await service.importBundle(tenantId, tempFile, req.user?.id || 'unknown');

        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    } finally {
        try { await unlink(tempFile); } catch {}
    }
});

// Get Import
airgapRouter.get('/imports/:id', async (req: any, res) => {
    try {
        const result = await service.getImport(req.params.id, req.tenantId);
        if (!result) return res.status(404).json({ error: 'Import not found' });
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
