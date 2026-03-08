"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SSOService_js_1 = require("../auth/sso/SSOService.js");
const router = (0, express_1.Router)();
const ssoService = new SSOService_js_1.SSOService();
router.get('/providers', async (req, res) => {
    try {
        const providers = await ssoService.getAllProviders();
        res.json(providers);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:provider/login', async (req, res) => {
    const { provider } = req.params;
    // Use referer or configured base URL, but for now simple construction
    const host = req.get('host');
    const protocol = req.protocol;
    const redirectUri = `${protocol}://${host}/auth/sso/${provider}/callback`;
    try {
        const { url } = await ssoService.handleLogin(provider, redirectUri);
        res.redirect(url);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/:provider/callback', async (req, res) => {
    const { provider } = req.params;
    const params = req.query;
    const host = req.get('host');
    const protocol = req.protocol;
    const redirectUri = `${protocol}://${host}/auth/sso/${provider}/callback`;
    try {
        const result = await ssoService.handleCallback(provider, params, redirectUri);
        // In a real app, redirection to frontend with token is typical.
        // For API-only prompt compliance: return JSON.
        res.json(result);
    }
    catch (err) {
        res.status(401).json({ error: err.message });
    }
});
exports.default = router;
