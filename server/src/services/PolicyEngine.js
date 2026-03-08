"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const events_1 = require("events");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const js_yaml_1 = __importDefault(require("js-yaml"));
const index_js_1 = require("../audit/index.js");
const errors_js_1 = require("../lib/errors.js");
const url_1 = require("url");
const path_2 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_2.default.dirname(__filename);
class PolicyEngine extends events_1.EventEmitter {
    static instance;
    config;
    auditSystem = null;
    initialized = false;
    opaUrl = 'http://localhost:8181/v1/data/governance/allow';
    constructor() {
        super();
        // Use getInstance without params, assuming it's already initialized by the main app
        // or fallback to lazy initialization if possible
        try {
            this.auditSystem = (0, index_js_1.getAuditSystem)();
        }
        catch (e) {
            // If not initialized, we can't really log audits effectively yet.
            // We'll let it fail or log to console.
            console.warn('PolicyEngine: AuditSystem not ready', e);
        }
    }
    static getInstance() {
        if (!PolicyEngine.instance) {
            PolicyEngine.instance = new PolicyEngine();
        }
        return PolicyEngine.instance;
    }
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Use process.cwd() to be safe against location changes
            const configPath = (0, path_1.join)(process.cwd(), 'policy/governance-config.yaml');
            try {
                const fileContents = await (0, promises_1.readFile)(configPath, 'utf8');
                this.config = js_yaml_1.default.load(fileContents);
                console.log('PolicyEngine loaded configuration from', configPath);
            }
            catch (e) {
                console.warn('PolicyEngine could not load config file from', configPath, e);
                // Fallback
                this.config = {
                    environments: {
                        dev: { mode: 'permissive', enforce: false },
                        staging: { mode: 'strict', enforce: true },
                        prod: { mode: 'strict', enforce: true }
                    }
                };
            }
            this.initialized = true;
        }
        catch (error) {
            console.error('Failed to initialize PolicyEngine', error);
            throw error;
        }
    }
    /**
     * Evaluate a policy decision
     */
    async evaluate(context) {
        if (!this.initialized)
            await this.initialize();
        // Determine environment mode
        const env = context.environment || process.env.NODE_ENV || 'dev';
        const envConfig = this.config?.environments?.[env] || this.config?.environments?.dev;
        // Try OPA first
        let decision;
        try {
            decision = await this.queryOpa(context);
        }
        catch (e) {
            // Fallback to simulation if OPA is not available
            decision = this.simulateRegoEvaluation(context, envConfig);
        }
        // Audit Log
        if (this.auditSystem) {
            try {
                await this.auditSystem.log({ id: context.user.id, type: 'user', role: context.user.role, tenantId: context.user.tenantId }, context.action, { id: context.resource.id || 'unknown', type: context.resource.type }, { ...context, decision }, { decision: decision.allow ? 'ALLOW' : 'DENY' });
            }
            catch (e) {
                console.error('Failed to log audit event', e);
            }
        }
        return decision;
    }
    async queryOpa(context) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({ input: context });
            const req = http_1.default.request(this.opaUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                },
                timeout: 200 // fast timeout for sidecar
            }, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`OPA returned ${res.statusCode}`));
                    return;
                }
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(body);
                        // OPA result format: { result: boolean } or { result: { allow: boolean, ... } }
                        if (result.result === true || result.result === false) {
                            resolve({ allow: result.result });
                        }
                        else if (result.result && typeof result.result.allow === 'boolean') {
                            resolve({ allow: result.result.allow, reason: result.result.reason });
                        }
                        else {
                            // If undefined, default to deny
                            resolve({ allow: false, reason: 'OPA result undefined' });
                        }
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', (e) => reject(e));
            req.write(data);
            req.end();
        });
    }
    simulateRegoEvaluation(context, envConfig) {
        // Logic matching governance.rego
        // 1. Admin Bypass
        if (context.user.role === 'admin') {
            return { allow: true, reason: 'Admin bypass' };
        }
        // 2. Dev Environment Permissiveness
        if (envConfig && envConfig.mode === 'permissive') {
            if (context.environment === 'dev') {
                return { allow: true, reason: 'Dev environment permissive' };
            }
        }
        // 3. Compliance Blocks
        if (context.resource.sensitivity === 'TOP_SECRET' && (context.user.clearance_level || 0) < 5) {
            return { allow: false, reason: 'Insufficient clearance for TOP_SECRET' };
        }
        // 4. Permission Check
        if (context.user.permissions && context.user.permissions.includes(context.action)) {
            // 5. Runtime Checks
            if (context.action === 'copilot_query') {
                const query = context.resource.query || '';
                if (/ssn|credit card/i.test(query)) {
                    return { allow: false, reason: 'PII detected in query' };
                }
            }
            return { allow: true };
        }
        return { allow: false, reason: 'Insufficient permissions' };
    }
    /**
     * Express Middleware for Policy Enforcement
     */
    middleware(action, resourceType) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return next(new errors_js_1.AppError('Unauthorized', 401));
                }
                const context = {
                    environment: process.env.NODE_ENV || 'dev',
                    user: req.user,
                    action,
                    resource: {
                        type: resourceType,
                        ...req.params,
                        ...req.body
                    }
                };
                const decision = await this.evaluate(context);
                if (!decision.allow) {
                    return next(new errors_js_1.AppError(`Policy Violation: ${decision.reason}`, 403));
                }
                next();
            }
            catch (error) {
                next(error);
            }
        };
    }
}
exports.PolicyEngine = PolicyEngine;
