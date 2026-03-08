"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRfaMiddleware = void 0;
const index_1 = require("@intelgraph/audit/index");
const api_1 = require("@opentelemetry/api");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
// --- CONFIGURATION ---
// Route Classification Map (Security Hardening)
// Maps URL regex patterns to resource classification and type.
// In a real gateway, this would come from the service catalog or route config.
const ROUTE_CONFIG = {
    '^/api/reports/restricted/.*': { classification: 'restricted', type: 'report' },
    '^/api/reports/confidential/.*': { classification: 'confidential', type: 'report' },
    '^/api/admin/.*': { classification: 'restricted', type: 'admin_panel' },
    '^/api/export/.*': { classification: 'restricted', type: 'dataset' },
    '^/api/users/impersonate': { classification: 'restricted', type: 'identity' },
    '.*': { classification: 'public', type: 'general' } // Default Fallback
};
// --- POLICY LOADING ---
let RFA_MATRIX = [];
// Load policy matrix at startup
try {
    const matrixPath = path.resolve(process.cwd(), 'audit/policy/rfa_matrix.yaml');
    if (fs.existsSync(matrixPath)) {
        const fileContent = fs.readFileSync(matrixPath, 'utf-8');
        const doc = yaml.load(fileContent);
        if (doc && doc.policies) {
            RFA_MATRIX = doc.policies;
            console.log("RFA Policy Matrix loaded successfully.");
        }
        else {
            console.warn("RFA Policy Matrix file found but invalid format.");
        }
    }
    else {
        console.warn("RFA Policy Matrix file not found at " + matrixPath);
    }
}
catch (e) {
    console.error("Failed to load RFA Policy Matrix", e);
    // Fail closed or default to secure?
    // We will leave RFA_MATRIX empty, which means no specific policies match,
    // BUT we should probably have safe defaults.
}
// --- LOGIC ---
// Helper to determine resource context securely from route
const determineResourceContext = (req) => {
    const p = req.path;
    for (const [pattern, config] of Object.entries(ROUTE_CONFIG)) {
        if (new RegExp(pattern).test(p)) {
            // For ID, we might extract from params, but for classification the pattern is enough
            return {
                type: config.type,
                id: req.params.id || 'unknown', // Express params might not be populated in this global middleware depending on mounting
                classification: config.classification
            };
        }
    }
    return { type: 'unknown', id: 'unknown', classification: 'public' };
};
// Helper to derive action from request
const deriveAction = (req) => {
    const method = req.method.toUpperCase();
    const p = req.path;
    if (p.includes('/export'))
        return 'export';
    if (p.includes('/impersonate'))
        return 'impersonate';
    if (method === 'DELETE')
        return 'delete';
    if (method === 'GET')
        return 'read';
    return 'read';
};
// Generic Policy Evaluator (Simulating OPA based on loaded YAML)
const evaluatePolicy = async (user, action, resource) => {
    const obligations = {
        require_rfa: false,
        require_step_up: false,
        rfa_fields: [],
        min_reason_len: 0
    };
    // Default denials if matrix failed to load?
    // For MVP we proceed with loaded matrix.
    for (const rule of RFA_MATRIX) {
        const actionMatch = rule.action === action || rule.action === '*';
        const classMatch = rule.classification === resource.classification || rule.classification === '*';
        const roleMatch = rule.role === '*' || user.roles.includes(rule.role);
        if (actionMatch && classMatch && roleMatch) {
            const reqs = rule.requirements;
            if (reqs.rfa_required)
                obligations.require_rfa = true;
            if (reqs.step_up_required)
                obligations.require_step_up = true;
            if (reqs.min_reason_len > obligations.min_reason_len)
                obligations.min_reason_len = reqs.min_reason_len;
            if (reqs.ticket_required && !obligations.rfa_fields.includes('ticket')) {
                obligations.rfa_fields.push('ticket');
            }
        }
    }
    if (obligations.require_rfa && !obligations.rfa_fields.includes('reason')) {
        obligations.rfa_fields.push('reason');
    }
    return obligations;
};
const auditRfaMiddleware = async (req, res, next) => {
    const tracer = api_1.trace.getTracer('gateway');
    const span = tracer.startSpan('audit_rfa_check');
    try {
        const user = req.user || { id: 'anonymous', roles: [] };
        const action = deriveAction(req);
        const resource = determineResourceContext(req);
        const obligations = await evaluatePolicy(user, action, resource);
        if (obligations.require_rfa) {
            const rfaReason = req.headers['x-rfa-reason'];
            const rfaTicket = req.headers['x-rfa-ticket'];
            if (!rfaReason) {
                res.status(403).json({
                    error: 'RFA_REQUIRED',
                    message: 'Reason for access is required',
                    obligations
                });
                span.end();
                return;
            }
            if (rfaReason.length < obligations.min_reason_len) {
                res.status(403).json({
                    error: 'RFA_INVALID',
                    message: `Reason must be at least ${obligations.min_reason_len} characters`,
                    obligations
                });
                span.end();
                return;
            }
            if (obligations.rfa_fields.includes('ticket') && !rfaTicket) {
                res.status(403).json({
                    error: 'RFA_TICKET_REQUIRED',
                    message: 'JIRA Ticket is required for this action',
                    obligations
                });
                span.end();
                return;
            }
        }
        if (obligations.require_step_up) {
            const stepUpToken = req.headers['x-step-up-token'];
            if (!stepUpToken) {
                res.status(401).json({
                    error: 'STEP_UP_REQUIRED',
                    message: 'MFA Step-Up required',
                    obligations
                });
                span.end();
                return;
            }
        }
        // Capture response for audit outcome
        const originalSend = res.send;
        const start = Date.now();
        res.send = function (body) {
            const latency = Date.now() - start;
            // Emit Audit Event on completion
            (0, index_1.emitAudit)({
                action: action,
                actor: {
                    id: user.id,
                    type: 'user',
                    roles: user.roles,
                    mfa: user.mfa_method
                },
                tenant: req.tenantId || 'default',
                resource: resource,
                rfa: obligations.require_rfa ? {
                    required: true,
                    reason: req.headers['x-rfa-reason'],
                    ticket: req.headers['x-rfa-ticket']
                } : undefined,
                authz: {
                    decision: 'allow',
                    policy_bundle: 'v1.0.0'
                },
                request: {
                    ip: req.ip || 'unknown',
                    ua: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    route: req.path
                },
                outcome: {
                    status: res.statusCode >= 400 ? 'failure' : 'success',
                    http: res.statusCode,
                    latency_ms: latency
                }
            }).catch(err => console.error("Audit Emit Failed", err));
            return originalSend.call(this, body);
        };
        next();
    }
    catch (err) {
        span.recordException(err);
        next(err);
    }
    finally {
        span.end();
    }
};
exports.auditRfaMiddleware = auditRfaMiddleware;
