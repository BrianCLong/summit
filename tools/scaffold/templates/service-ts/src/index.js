"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prom_client_1 = require("prom-client");
const winston_1 = __importDefault(require("winston"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const SERVICE_NAME = '{{SERVICE_NAME}}';
// Logger
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    defaultMeta: { service: SERVICE_NAME },
    transports: [new winston_1.default.transports.Console()],
});
// Metrics
(0, prom_client_1.collectDefaultMetrics)({ labels: { service: SERVICE_NAME } });
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '0.1.0' });
});
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prom_client_1.register.contentType);
    res.end(await prom_client_1.register.metrics());
});
app.get('/', (req, res) => {
    logger.info('Root endpoint called');
    res.send(`Hello from ${SERVICE_NAME}`);
});
app.listen(port, () => {
    logger.info(`Service ${SERVICE_NAME} listening on port ${port}`);
});
