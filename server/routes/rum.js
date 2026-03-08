"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prom_client_1 = __importDefault(require("prom-client"));
const r = express_1.default.Router();
const g = new prom_client_1.default.Gauge({
    name: 'rum_metric',
    help: 'web vitals',
    labelNames: ['name'],
});
r.post('/rum', express_1.default.text({ type: '*/*' }), (req, res) => {
    try {
        const { name, value } = JSON.parse(req.body || '{}');
        g.set({ name }, Number(value));
    }
    catch { }
    res.status(204).end();
});
exports.default = r;
