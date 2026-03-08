"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("./config.js");
const logging_js_1 = require("./middleware/logging.js");
const server_js_1 = require("./server.js");
const app = (0, server_js_1.createServer)();
app.listen(config_js_1.config.port, () => {
    logging_js_1.logger.info({ port: config_js_1.config.port }, 'golden-path service started');
});
