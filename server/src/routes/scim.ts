import { Router, Response, NextFunction } from 'express';
import { scimService } from '../services/scim/ScimService.js';
import { ScimUser, ScimGroup, ScimPatchRequest, ScimBulkRequest } from '../services/scim/types.js';
import type { AuthenticatedRequest } from './types.js';

const router = Router();
const singleParam = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value[0] : value ?? '';
const singleQuery = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

router.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type'] !== 'application/scim+json' && req.headers['content-type'] !== 'application/json') {
         // Should ideally reject, but keeping lax for compatibility
    }
    next();
});

const handleError = (res: Response, error: any) => {
    const status = error.message.includes("not found") ? 404 : 500;
    res.status(status).json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: status.toString(),
        detail: error.message
    });
};

// --- Users ---

router.get('/Users', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const startIndex = singleQuery(req.query.startIndex as string | string[] | undefined);
        const count = singleQuery(req.query.count as string | string[] | undefined);
        const filter = singleQuery(req.query.filter as string | string[] | undefined);
        const sortBy = singleQuery(req.query.sortBy as string | string[] | undefined);
        const sortOrder = singleQuery(req.query.sortOrder as string | string[] | undefined);
        const tenantId = req.user?.tenantId || 'default';
        const result = await scimService.listUsers(
            tenantId,
            Number(startIndex) || 1,
            Number(count) || 100,
            filter as string,
            sortBy as string,
            sortOrder as string
        );
        res.header('Content-Type', 'application/scim+json');
        res.json(result);
    } catch (error: any) {
        handleError(res, error);
    }
});

router.post('/Users', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const user = await scimService.createUser(tenantId, req.body as ScimUser);
        res.status(201).header('Content-Type', 'application/scim+json').json(user);
    } catch (error: any) {
        handleError(res, error);
    }
});

router.get('/Users/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
         const tenantId = req.user?.tenantId || 'default';
         const userId = singleParam(req.params.id);
         const user = await scimService.getUser(tenantId, userId);
         if (!user) {
             res.status(404).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: "404", detail: "User not found" });
             return;
         }
         res.header('Content-Type', 'application/scim+json').json(user);
    } catch (error: any) {
        handleError(res, error);
    }
});

router.put('/Users/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const userId = singleParam(req.params.id);
        const user = await scimService.updateUser(tenantId, userId, req.body as ScimUser);
        res.header('Content-Type', 'application/scim+json').json(user);
    } catch (error: any) {
        handleError(res, error);
    }
});

router.patch('/Users/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const userId = singleParam(req.params.id);
        const user = await scimService.patchUser(tenantId, userId, req.body as ScimPatchRequest);
        res.header('Content-Type', 'application/scim+json').json(user);
    } catch (error: any) {
        handleError(res, error);
    }
});

router.delete('/Users/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const userId = singleParam(req.params.id);
        await scimService.deleteUser(tenantId, userId);
        res.status(204).end();
    } catch (error: any) {
        handleError(res, error);
    }
});

// --- Groups ---

router.get('/Groups', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const startIndex = singleQuery(req.query.startIndex as string | string[] | undefined);
        const count = singleQuery(req.query.count as string | string[] | undefined);
        const filter = singleQuery(req.query.filter as string | string[] | undefined);
        const sortBy = singleQuery(req.query.sortBy as string | string[] | undefined);
        const sortOrder = singleQuery(req.query.sortOrder as string | string[] | undefined);
        const tenantId = req.user?.tenantId || 'default';
        const result = await scimService.listGroups(
            tenantId,
            Number(startIndex) || 1,
            Number(count) || 100,
            filter as string,
            sortBy as string,
            sortOrder as string
        );
        res.header('Content-Type', 'application/scim+json');
        res.json(result);
    } catch (error: any) {
        handleError(res, error);
    }
});

router.post('/Groups', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const group = await scimService.createGroup(tenantId, req.body as ScimGroup);
        res.status(201).header('Content-Type', 'application/scim+json').json(group);
    } catch (error: any) {
        handleError(res, error);
    }
});

router.get('/Groups/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
         const tenantId = req.user?.tenantId || 'default';
         const groupId = singleParam(req.params.id);
         const group = await scimService.getGroup(tenantId, groupId);
         if (!group) {
             res.status(404).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: "404", detail: "Group not found" });
             return;
         }
         res.header('Content-Type', 'application/scim+json').json(group);
    } catch (error: any) {
        handleError(res, error);
    }
});

router.put('/Groups/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const groupId = singleParam(req.params.id);
        const group = await scimService.updateGroup(tenantId, groupId, req.body as ScimGroup);
        res.header('Content-Type', 'application/scim+json').json(group);
    } catch (error: any) {
         handleError(res, error);
    }
});

router.delete('/Groups/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const groupId = singleParam(req.params.id);
        await scimService.deleteGroup(tenantId, groupId);
        res.status(204).end();
    } catch (error: any) {
         handleError(res, error);
    }
});

router.patch('/Groups/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const groupId = singleParam(req.params.id);
        const group = await scimService.patchGroup(tenantId, groupId, req.body as ScimPatchRequest);
        res.header('Content-Type', 'application/scim+json').json(group);
    } catch (error: any) {
         handleError(res, error);
    }
});

// --- Bulk ---

router.post('/Bulk', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const result = await scimService.processBulk(tenantId, req.body as ScimBulkRequest);
        res.header('Content-Type', 'application/scim+json').json(result);
    } catch (error: any) {
        handleError(res, error);
    }
});

export default router;
