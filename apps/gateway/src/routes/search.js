"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const typesense_1 = require("../lib/typesense");
const logger_1 = require("../logger");
const router = (0, express_1.Router)();
function getTenantId(req) {
    return req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
}
function getRoles(req) {
    // Only trust verified roles from middleware (req.user)
    if (req.user?.roles && Array.isArray(req.user.roles)) {
        return req.user.roles;
    }
    return [];
}
router.post('/v1/search', async (req, res) => {
    try {
        const { collection, q, query_by, filter_by, page, per_page, facet_by, ...rest } = req.body;
        const tenantId = getTenantId(req);
        if (!collection) {
            return res.status(400).json({ error: 'Missing collection' });
        }
        const userClearance = req.user?.clearance || 0;
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
        const result = await typesense_1.typesenseClient.collections(collectionAlias).documents().search(searchParams);
        res.json(result);
    }
    catch (err) {
        logger_1.logger.error('Search failed', err, { tenantId: getTenantId(req) });
        res.status(500).json({ error: err.message });
    }
});
router.post('/v1/search/suggest', async (req, res) => {
    try {
        const { collection, q, query_by, filter_by, ...rest } = req.body;
        const tenantId = getTenantId(req);
        if (!collection) {
            return res.status(400).json({ error: 'Missing collection' });
        }
        const userClearance = req.user?.clearance || 0;
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
        const result = await typesense_1.typesenseClient.collections(collectionAlias).documents().search(searchParams);
        res.json(result);
    }
    catch (err) {
        logger_1.logger.error('Suggest failed', err, { tenantId: getTenantId(req) });
        res.status(500).json({ error: err.message });
    }
});
router.post('/v1/search/admin/reindex', async (req, res) => {
    const roles = getRoles(req);
    if (!roles.includes('admin')) {
        logger_1.logger.warn('Unauthorized reindex attempt', { tenantId: getTenantId(req), roles });
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    res.json({ status: 'triggered', job_id: 'job-' + Date.now() });
});
exports.default = router;
