"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMetricsServer = startMetricsServer;
const http_1 = __importDefault(require("http"));
function startMetricsServer({ port = 9464, registry, }) {
    const server = http_1.default.createServer(async (req, res) => {
        if (req.url === '/metrics') {
            const metrics = await registry.metrics();
            res.setHeader('Content-Type', registry.contentType);
            res.writeHead(200);
            res.end(metrics);
            return;
        }
        res.writeHead(404);
        res.end();
    });
    server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Receipt worker metrics exposed on :${port}/metrics`);
    });
    return server;
}
