import { Router } from 'express';
import { scimService } from '../services/scim/ScimService.js';
import { ScimUser } from '../services/scim/types.js';

const router = Router();

router.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type'] !== 'application/scim+json' && req.headers['content-type'] !== 'application/json') {
         // Allow lax content-type for compatibility
    }
    next();
});

router.get('/Users', async (req, res) => {
    try {
        const { startIndex, count } = req.query;
        // @ts-ignore
        const tenantId = req.user?.tenantId || 'default';
        const result = await scimService.listUsers(tenantId, Number(startIndex) || 1, Number(count) || 100);
        res.header('Content-Type', 'application/scim+json');
        res.json(result);
    } catch (error) {
        res.status(500).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: "500" });
    }
});

router.post('/Users', async (req, res) => {
    try {
        // @ts-ignore
        const tenantId = req.user?.tenantId || 'default';
        const user = await scimService.createUser(tenantId, req.body as ScimUser);
        res.status(201).header('Content-Type', 'application/scim+json').json(user);
    } catch (error) {
        res.status(500).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: "500" });
    }
});

router.get('/Users/:id', async (req, res) => {
     // @ts-ignore
     const tenantId = req.user?.tenantId || 'default';
     const user = await scimService.getUser(tenantId, req.params.id);
     if (!user) {
         res.status(404).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: "404", detail: "User not found" });
         return;
     }
     res.header('Content-Type', 'application/scim+json').json(user);
});

router.put('/Users/:id', async (req, res) => {
    // @ts-ignore
    const tenantId = req.user?.tenantId || 'default';
    const user = await scimService.updateUser(tenantId, req.params.id, req.body);
    res.header('Content-Type', 'application/scim+json').json(user);
});

router.delete('/Users/:id', async (req, res) => {
    // @ts-ignore
    const tenantId = req.user?.tenantId || 'default';
    await scimService.deleteUser(tenantId, req.params.id);
    res.status(204).end();
});

export default router;
