"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFunnelReport = exports.createFunnel = void 0;
const FunnelService_js_1 = require("./FunnelService.js");
const path_1 = __importDefault(require("path"));
const http_param_js_1 = require("../../utils/http-param.js");
const LOG_DIR = process.env.TELEMETRY_LOG_DIR || path_1.default.join(process.cwd(), 'logs', 'telemetry');
const service = new FunnelService_js_1.FunnelService(LOG_DIR);
const createFunnel = (req, res) => {
    const funnel = req.body;
    if (!funnel.id || !funnel.steps || funnel.steps.length === 0) {
        return res.status(400).json({ error: 'Invalid funnel' });
    }
    service.createFunnel(funnel);
    res.status(201).json(funnel);
};
exports.createFunnel = createFunnel;
const getFunnelReport = (req, res) => {
    const id = (0, http_param_js_1.firstString)(req.params.id);
    if (!id)
        return res.status(400).json({ error: 'id is required' });
    try {
        const report = service.generateReport(id);
        res.json(report);
    }
    catch (e) {
        res.status(404).json({ error: e.message });
    }
};
exports.getFunnelReport = getFunnelReport;
