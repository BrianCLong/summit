"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.airgapRouter = void 0;
const express_1 = require("express");
const AirgapService_js_1 = require("../services/AirgapService.js");
const tenantHeader_js_1 = require("../middleware/tenantHeader.js");
const auth_js_1 = require("../middleware/auth.js");
const database_js_1 = require("../config/database.js");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
exports.airgapRouter = (0, express_1.Router)();
const service = new AirgapService_js_1.AirgapService();
// SEC-Hardening: Enforce RBAC for airgap operations
exports.airgapRouter.use((0, auth_js_1.ensureRole)(['ADMIN', 'ANALYST']));
// Middleware to ensure tenant context
exports.airgapRouter.use((0, tenantHeader_js_1.tenantHeader)());
// SEC-2025-001: Enforce authentication and admin role for airgap operations
exports.airgapRouter.use(auth_js_1.ensureAuthenticated);
exports.airgapRouter.use((0, auth_js_1.ensureRole)(['ADMIN', 'admin']));
// Export Route
exports.airgapRouter.post('/export', async (req, res) => {
    let session;
    try {
        const tenantId = req.tenantId;
        session = (0, database_js_1.getNeo4jDriver)().session();
        const request = {
            ...req.body,
            tenantId,
            userId: req.user?.id || 'unknown'
        };
        const result = await service.exportBundle(request, session);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
    finally {
        if (session)
            await session.close();
    }
});
// Import Route - streams body to file
exports.airgapRouter.post('/import', async (req, res) => {
    const tenantId = req.tenantId;
    const tempFile = (0, path_1.join)('/tmp', `import-${(0, crypto_1.randomUUID)()}.zip`);
    try {
        const writeStream = (0, fs_1.createWriteStream)(tempFile);
        await new Promise((resolve, reject) => {
            req.pipe(writeStream);
            writeStream.on('finish', () => resolve());
            writeStream.on('error', reject);
            req.on('error', reject);
        });
        const result = await service.importBundle(tenantId, tempFile, req.user?.id || 'unknown');
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
    finally {
        try {
            await (0, promises_1.unlink)(tempFile);
        }
        catch { }
    }
});
// Get Import
exports.airgapRouter.get('/imports/:id', async (req, res) => {
    try {
        const result = await service.getImport(req.params.id, req.tenantId);
        if (!result)
            return res.status(404).json({ error: 'Import not found' });
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
