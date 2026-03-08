"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const config_js_1 = require("./config.js");
const logger_js_1 = require("./logger.js");
const server = app_js_1.app.listen(config_js_1.config.PORT, () => {
    logger_js_1.logger.info(`Server listening on port ${config_js_1.config.PORT}`);
});
const gracefulShutdown = () => {
    logger_js_1.logger.info('Received kill signal, shutting down gracefully');
    server.close(() => {
        logger_js_1.logger.info('Closed out remaining connections');
        process.exit(0);
    });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
