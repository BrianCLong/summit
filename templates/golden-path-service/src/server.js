"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const logging_js_1 = require("./middleware/logging.js");
const request_context_js_1 = require("./middleware/request-context.js");
const health_js_1 = require("./routes/health.js");
const metrics_js_1 = require("./routes/metrics.js");
const secure_js_1 = require("./routes/secure.js");
const metrics_js_2 = require("./observability/metrics.js");
const policy_client_js_1 = require("./policy-client.js");
const config_js_1 = require("./config.js");
const createServer = (options = {}) => {
    const app = (0, express_1.default)();
    const policyEvaluator = options.policyEvaluator ?? policy_client_js_1.checkAccess;
    const metricsEnabled = options.metricsEnabled ?? config_js_1.config.metricsEnabled;
    const secureApprovalEnabled = options.secureApprovalEnabled ?? config_js_1.config.featureFlagSecureApproval;
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)());
    app.use(express_1.default.json());
    app.use(request_context_js_1.bindRequestContext);
    app.use(logging_js_1.loggingMiddleware);
    app.use((req, res, next) => {
        const end = metrics_js_2.httpRequestDuration.startTimer({ method: req.method, route: req.path });
        res.on('finish', () => {
            const labels = { method: req.method, route: req.route?.path || req.path, status: res.statusCode };
            metrics_js_2.httpRequestTotal.inc(labels);
            if (res.statusCode >= 400) {
                metrics_js_2.httpRequestErrors.inc(labels);
            }
            end({ status: res.statusCode });
        });
        next();
    });
    app.use(health_js_1.healthRouter);
    if (metricsEnabled) {
        app.use(metrics_js_1.metricsRouter);
    }
    else {
        app.get('/metrics', (_req, res) => res.status(404).json({ message: 'metrics-disabled' }));
    }
    if (secureApprovalEnabled) {
        app.use((0, secure_js_1.buildSecureRouter)(policyEvaluator));
    }
    app.get('/hello', (_req, res) => {
        res.json({ message: 'hello, world' });
    });
    app.use((err, _req, res, _next) => {
        res.status(500).json({ message: 'internal_error', detail: err.message });
    });
    return app;
};
exports.createServer = createServer;
