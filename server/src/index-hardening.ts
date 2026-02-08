import { createApp } from './app-hardening.js';
import { logger } from './config/logger.js';

const startServer = async () => {
    try {
        const port = process.env.PORT || 4000;
        const app = await createApp();

        app.listen(port, () => {
            logger.info(`🚀 Hardened Server ready at http://localhost:${port}`);
            console.log(`🚀 Hardened Server ready at http://localhost:${port}`);
        });
    } catch (error) {
        logger.error('Failed to start hardened server:', error);
        process.exit(1);
    }
};

startServer();
