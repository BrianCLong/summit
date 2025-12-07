import express from 'express';
import OIDCAuthService from '../services/OIDCAuthService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const authService = new OIDCAuthService();

// Initiate login
router.get('/login/:provider', (req, res) => {
    try {
        const { provider } = req.params;
        const url = authService.generateAuthUrl(provider);
        res.redirect(url);
    } catch (e: any) {
        res.status(400).send(e.message);
    }
});

// Callback
router.get('/callback/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const { code, state } = req.query;
        if (!code || !state) {
            throw new Error('Missing code or state');
        }
        const user = await authService.handleCallback(provider, code as string, state as string);
        // In a real app, set a session cookie or return a JWT
        // For now, redirect to dashboard with token in query (simplified)
        // Or render a success page
        res.json({ message: 'Authentication successful', user });
    } catch (e: any) {
        res.status(500).send(e.message);
    }
});

// SCIM Provisioning (requires authentication, likely an API key or Admin token)
// In practice, IDPs use a specific Bearer token.
router.post('/scim/v2/Users', async (req, res) => {
    // Basic protection (should be enhanced)
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({ error: 'Unauthorized' });
    }
    // Verify SCIM token (implementation detail omitted)

    await authService.handleSCIMProvisioning(req, res);
});

export default router;
