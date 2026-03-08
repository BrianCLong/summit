"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ScimService_js_1 = require("../services/scim/ScimService.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type'] !== 'application/scim+json' && req.headers['content-type'] !== 'application/json') {
        // Should ideally reject, but keeping lax for compatibility
    }
    next();
});
const handleError = (res, error) => {
    const status = error.message.includes("not found") ? 404 : 500;
    res.status(status).json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: status.toString(),
        detail: error.message
    });
};
// --- Users ---
router.get('/Users', async (req, res) => {
    try {
        const startIndex = (0, http_param_js_1.firstString)(req.query.startIndex);
        const count = (0, http_param_js_1.firstString)(req.query.count);
        const filter = (0, http_param_js_1.firstString)(req.query.filter);
        const sortBy = (0, http_param_js_1.firstString)(req.query.sortBy);
        const sortOrder = (0, http_param_js_1.firstString)(req.query.sortOrder);
        const tenantId = req.user?.tenantId || 'default';
        const result = await ScimService_js_1.scimService.listUsers(tenantId, Number(startIndex) || 1, Number(count) || 100, filter, sortBy, sortOrder);
        res.header('Content-Type', 'application/scim+json');
        res.json(result);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.post('/Users', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const user = await ScimService_js_1.scimService.createUser(tenantId, req.body);
        res.status(201).header('Content-Type', 'application/scim+json').json(user);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.get('/Users/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const user = await ScimService_js_1.scimService.getUser(tenantId, (0, http_param_js_1.firstStringOr)(req.params.id, ''));
        if (!user) {
            res.status(404).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: "404", detail: "User not found" });
            return;
        }
        res.header('Content-Type', 'application/scim+json').json(user);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.put('/Users/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const user = await ScimService_js_1.scimService.updateUser(tenantId, (0, http_param_js_1.firstStringOr)(req.params.id, ''), req.body);
        res.header('Content-Type', 'application/scim+json').json(user);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.patch('/Users/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const user = await ScimService_js_1.scimService.patchUser(tenantId, (0, http_param_js_1.firstStringOr)(req.params.id, ''), req.body);
        res.header('Content-Type', 'application/scim+json').json(user);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.delete('/Users/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        await ScimService_js_1.scimService.deleteUser(tenantId, (0, http_param_js_1.firstStringOr)(req.params.id, ''));
        res.status(204).end();
    }
    catch (error) {
        handleError(res, error);
    }
});
// --- Groups ---
router.get('/Groups', async (req, res) => {
    try {
        const startIndex = (0, http_param_js_1.firstString)(req.query.startIndex);
        const count = (0, http_param_js_1.firstString)(req.query.count);
        const filter = (0, http_param_js_1.firstString)(req.query.filter);
        const sortBy = (0, http_param_js_1.firstString)(req.query.sortBy);
        const sortOrder = (0, http_param_js_1.firstString)(req.query.sortOrder);
        const tenantId = req.user?.tenantId || 'default';
        const result = await ScimService_js_1.scimService.listGroups(tenantId, Number(startIndex) || 1, Number(count) || 100, filter, sortBy, sortOrder);
        res.header('Content-Type', 'application/scim+json');
        res.json(result);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.post('/Groups', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const group = await ScimService_js_1.scimService.createGroup(tenantId, req.body);
        res.status(201).header('Content-Type', 'application/scim+json').json(group);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.get('/Groups/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const group = await ScimService_js_1.scimService.getGroup(tenantId, (0, http_param_js_1.firstStringOr)(req.params.id, ''));
        if (!group) {
            res.status(404).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: "404", detail: "Group not found" });
            return;
        }
        res.header('Content-Type', 'application/scim+json').json(group);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.put('/Groups/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const group = await ScimService_js_1.scimService.updateGroup(tenantId, (0, http_param_js_1.firstStringOr)(req.params.id, ''), req.body);
        res.header('Content-Type', 'application/scim+json').json(group);
    }
    catch (error) {
        handleError(res, error);
    }
});
router.delete('/Groups/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        await ScimService_js_1.scimService.deleteGroup(tenantId, (0, http_param_js_1.firstStringOr)(req.params.id, ''));
        res.status(204).end();
    }
    catch (error) {
        handleError(res, error);
    }
});
router.patch('/Groups/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const group = await ScimService_js_1.scimService.patchGroup(tenantId, (0, http_param_js_1.firstStringOr)(req.params.id, ''), req.body);
        res.header('Content-Type', 'application/scim+json').json(group);
    }
    catch (error) {
        handleError(res, error);
    }
});
// --- Bulk ---
router.post('/Bulk', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const result = await ScimService_js_1.scimService.processBulk(tenantId, req.body);
        res.header('Content-Type', 'application/scim+json').json(result);
    }
    catch (error) {
        handleError(res, error);
    }
});
exports.default = router;
