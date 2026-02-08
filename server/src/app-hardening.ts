import express from 'express';
import { logger as appLogger } from './config/logger.js';
import { hsmEnforcement } from './federal/hsm-enforcement.js';

export const createApp = async () => {
    const app = express();
    app.use(express.json());

    // Basic logging
    app.use((req: any, res: any, next: any) => {
        req.log = appLogger;
        next();
    });

    // Health endpoints
    app.get('/health', (req, res) => res.json({ status: 'ok', source: 'hardening-mock' }));
    app.get('/health/ready', (req, res) => res.json({ status: 'ready', hsm: 'probed' }));
    app.get('/health/live', (req, res) => res.json({ status: 'live' }));

    // HSM Enforcement Middleware (The core of what we want to verify)
    app.use('/api', hsmEnforcement.middleware());

    // Test endpoint for HSM protection
    app.get('/api/hsm-check', (req, res) => {
        res.json({
            success: true,
            message: 'HSM enforcement passed',
            timestamp: new Date().toISOString()
        });
    });

    // Global Error Handler
    app.use((err: any, req: any, res: any, next: any) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'internal_error', message: err.message });
    });

    return app;
};
