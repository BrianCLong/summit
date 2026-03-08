"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const http_1 = require("./server/http");
const logging_1 = require("./observability/logging");
const main = async () => {
    try {
        (0, http_1.startServer)();
    }
    catch (error) {
        logging_1.logger.error('Failed to start the application', { error });
        process.exit(1);
    }
};
main();
