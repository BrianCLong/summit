"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const prom_client_1 = require("prom-client");
function startServer() {
    const app = (0, express_1.default)();
    const port = process.env.PORT || 3000;
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', prom_client_1.register.contentType);
        res.end(await prom_client_1.register.metrics());
    });
    app.listen(port, () => {
        console.log(`Reporting service listening on port ${port}`);
    });
    return app;
}
