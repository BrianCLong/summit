import { Router, Request, Response } from 'express';
import { typesenseClient } from '../lib/typesense';
import { logger } from '../logger';

const router = Router();

function getTenantId(req: Request): string {
    // Only trust verified tenant context from req.user
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
        logger.error('Security Failure: Request reached search route without tenant context');
        throw new Error('Unauthorized: Tenant context required');
    }
    return tenantId;
}

function getRoles(req: Request): string[] {
    // Only trust verified roles from middleware (req.user)
    const user = (req as any).user;
    if (user?.roles && Array.isArray(user.roles)) {
        return user.roles;
    }
    return [];
}

router.post('/v1/search', async (req: Request, res: Response) => {
    try {
        const { collection, q, query_by, filter_by, page, per_page, facet_by, ...rest } = req.body;
        const tenantId = getTenantId(req);

        if (!collection) {
             return res.status(400).json({ error: 'Missing collection' });
        }

        const userClearance = (req as any).user?.clearance || 0;
        const tenantFilter = `tenant:=${tenantId}`;
        const securityFilter = `classification:<= ${userClearance}`;
        const baseFilter = `${tenantFilter} && ${securityFilter}`;

        const finalFilter = filter_by ? `${baseFilter} && (${filter_by})` : baseFilter;

        const safePerPage = Math.min(Math.max(Number(per_page) || 10, 1), 50);
        const safePage = Math.min(Math.max(Number(page) || 1, 1), 50);

        const searchParams = {
            q: q || '*',
            query_by: query_by || 'title,body',
            filter_by: finalFilter,
            page: safePage,
            per_page: safePerPage,
            facet_by: facet_by,
            ...rest
        };

        const collectionAlias = `${collection}@current`;

        const result = await typesenseClient.collections(collectionAlias).documents().search(searchParams);
        res.json(result);
    } catch (err: any) {
        logger.error('Search failed', err, { tenantId: getTenantId(req) });
        res.status(500).json({ error: err.message });
    }
});

router.post('/v1/search/suggest', async (req: Request, res: Response) => {
     try {
        const { collection, q, query_by, filter_by, ...rest } = req.body;
        const tenantId = getTenantId(req);

        if (!collection) {
             return res.status(400).json({ error: 'Missing collection' });
        }

        const userClearance = (req as any).user?.clearance || 0;
        const tenantFilter = `tenant:=${tenantId}`;
        const securityFilter = `classification:<= ${userClearance}`;
        const baseFilter = `${tenantFilter} && ${securityFilter}`;

        const finalFilter = filter_by ? `${baseFilter} && (${filter_by})` : baseFilter;

        const searchParams = {
            q: q || '',
            query_by: query_by || 'title',
            filter_by: finalFilter,
            per_page: 5,
            ...rest
        };

         const collectionAlias = `${collection}@current`;
         const result = await typesenseClient.collections(collectionAlias).documents().search(searchParams);
         res.json(result);
     } catch (err: any) {
        logger.error('Suggest failed', err, { tenantId: getTenantId(req) });
        res.status(500).json({ error: err.message });
    }
});

router.post('/v1/search/admin/reindex', async (req: Request, res: Response) => {
    const roles = getRoles(req);
    if (!roles.includes('admin')) {
        logger.warn('Unauthorized reindex attempt', { tenantId: getTenantId(req), roles });
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    res.json({ status: 'triggered', job_id: 'job-' + Date.now() });
});

export default router;
