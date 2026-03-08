"use strict";
/**
 * Bootstrap for SPIFFE identity service.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const controller_js_1 = require("./controller.js");
function createServer() {
    const app = (0, express_1.default)();
    app.use('/identity', controller_js_1.router);
    return app;
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const app = createServer();
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
        console.log(`identity-spiffe service running on port ${port}`);
    });
}
