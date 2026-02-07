import http from 'http';
import { createApp } from './app.js';

const startServer = async () => {
    console.log('Starting Hardening Verification Server...');

    // Minimal bootstrap to satisfy app.ts dependencies
    process.env.SKIP_FEDERAL_CHECKS = 'true';
    process.env.ALLOW_SOFTWARE_CRYPTO = 'true';

    try {
        const app = await createApp();
        const port = process.env.PORT || 4000;
        const httpServer = http.createServer(app);

        httpServer.listen(port, () => {
            console.log(`[HARDENING-VERIFICATION] Server listening on port ${port}`);
            console.log(`[HARDENING-VERIFICATION] Health check: http://localhost:${port}/health/ready`);
        });
    } catch (error) {
        console.error('Failed to start hardening verification server:', error);
        process.exit(1);
    }
};

startServer().catch(err => {
    console.error('Unhandled bootstrap error:', err);
    process.exit(1);
});
