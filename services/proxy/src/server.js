"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const status_1 = __importDefault(require("./routes/status"));
const metrics_1 = require("./metrics");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '2mb' }));
app.use((0, metrics_1.timed)('all'));
app.use(status_1.default);
app.get('/metrics', metrics_1.metricsHandler);
app.listen(8787, () => console.log('Proxy listening on :8787'));
