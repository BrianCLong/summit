"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ApiKeyService_js_1 = require("../services/ApiKeyService.js");
const PartnerService_js_1 = require("../services/PartnerService.js");
const index_js_1 = require("../observability/index.js");
const router = (0, express_1.Router)();
// Middleware to validate API Key
const requireApiKey = async (req, res, next) => {
    const apiKeyHeader = req.headers['x-api-key'];
    if (!apiKeyHeader) {
        return res.status(401).json({ error: 'Missing X-API-Key header' });
    }
    const apiKey = await ApiKeyService_js_1.apiKeyService.validateApiKey(apiKeyHeader);
    if (!apiKey) {
        return res.status(403).json({ error: 'Invalid or expired API Key' });
    }
    req.partner = {
        tenantId: apiKey.tenant_id,
        scopes: apiKey.scopes,
        keyId: apiKey.id
    };
    next();
};
/**
 * @openapi
 * /api/partners/onboard:
 *   post:
 *     tags:
 *       - Partners
 *     summary: Onboard a new partner
 *     description: Submit a request to become a partner agency.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OnboardPartnerInput'
 *     responses:
 *       201:
 *         description: Application submitted
 *       400:
 *         description: Validation error
 */
router.post('/onboard', async (req, res) => {
    try {
        const input = PartnerService_js_1.OnboardPartnerSchema.parse(req.body);
        // Assuming auth middleware populated req.user
        const actorId = req.user?.id || 'system-onboarding';
        const result = await PartnerService_js_1.partnerService.registerPartner(input, actorId);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * @openapi
 * /api/partners/exchange/cases:
 *   post:
 *     tags:
 *       - Partners
 *     summary: Share case data
 *     security:
 *       - ApiKeyAuth: []
 *     description: Share a case with another partner.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetPartner
 *               - caseData
 *             properties:
 *               targetPartner:
 *                 type: string
 *                 description: Slug of the target partner
 *               caseData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Case shared successfully
 */
router.post('/exchange/cases', requireApiKey, async (req, res) => {
    try {
        const { targetPartner, caseData } = req.body;
        if (!targetPartner || !caseData) {
            return res.status(400).json({ error: 'Missing targetPartner or caseData' });
        }
        const result = await PartnerService_js_1.partnerService.shareCase(req.partner.tenantId, targetPartner, caseData);
        res.json(result);
    }
    catch (error) {
        index_js_1.logger.error('Case exchange failed', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * @openapi
 * /api/partners/keys:
 *   post:
 *     tags:
 *       - Partners
 *     summary: Create API Key
 *     description: Generate a new API key (Requires Auth).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: API Key created (returns token once)
 */
router.post('/keys', async (req, res) => {
    // Requires standard User Auth (JWT)
    if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const { name, scopes } = req.body;
        const result = await ApiKeyService_js_1.apiKeyService.createApiKey({
            tenantId: req.user.tenantId,
            name,
            scopes: scopes || ['read:basic'],
            createdBy: req.user.id
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @openapi
 * /api/partners/keys:
 *   get:
 *     tags:
 *       - Partners
 *     summary: List API Keys
 *     responses:
 *       200:
 *         description: List of active API keys
 */
router.get('/keys', async (req, res) => {
    if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const keys = await ApiKeyService_js_1.apiKeyService.listApiKeys(req.user.tenantId);
        res.json(keys);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @openapi
 * /api/partners/keys/{id}:
 *   delete:
 *     tags:
 *       - Partners
 *     summary: Revoke API Key
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Revoked
 */
router.delete('/keys/:id', async (req, res) => {
    if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        await ApiKeyService_js_1.apiKeyService.revokeApiKey(req.params.id, req.user.tenantId);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
