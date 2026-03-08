"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_hardening_js_1 = require("./app-hardening.js");
const logger_js_1 = require("./config/logger.js");
const startServer = async () => {
    try {
        const port = process.env.PORT || 4000;
        const app = await (0, app_hardening_js_1.createApp)();
        app.listen(port, () => {
            logger_js_1.logger.info(`🚀 Hardened Server ready at http://localhost:${port}`);
            console.log(`🚀 Hardened Server ready at http://localhost:${port}`);
        });
    }
    catch (error) {
        logger_js_1.logger.error('Failed to start hardened server:', error);
        process.exit(1);
    }
};
startServer();
