"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordLead = recordLead;
exports.recordDeploy = recordDeploy;
const prom_client_1 = __importDefault(require("prom-client"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const r = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register: r });
const gLead = new prom_client_1.default.Gauge({
    name: 'dora_lead_time_minutes',
    help: 'Lead time',
    labelNames: ['service'],
});
const gDeploy = new prom_client_1.default.Counter({
    name: 'dora_deploys_total',
    help: 'Deploys',
    labelNames: ['env'],
});
r.registerMetric(gLead);
r.registerMetric(gDeploy);
function recordLead(minutes) {
    gLead.labels('maestro').set(minutes);
}
function recordDeploy(env) {
    gDeploy.labels(env).inc();
}
app.get('/metrics', async (_req, res) => {
    res.type(r.contentType);
    res.end(await r.metrics());
});
app.listen(process.env.PORT || 9109);
