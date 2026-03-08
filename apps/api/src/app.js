"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const express_1 = __importDefault(require("express"));
const execute_js_1 = require("./routes/actions/execute.js");
const preflight_js_1 = require("./routes/actions/preflight.js");
const index_js_1 = require("./routes/epics/index.js");
const get_js_1 = require("./routes/receipts/get.js");
const policy_decisions_js_1 = require("./db/models/policy_decisions.js");
const PolicyDecisionStore_js_1 = require("./services/PolicyDecisionStore.js");
const EventPublisher_js_1 = require("./services/EventPublisher.js");
const EpicService_js_1 = require("./services/EpicService.js");
const policyService_js_1 = require("./services/policyService.js");
const ReviewQueueService_js_1 = require("./review/ReviewQueueService.js");
const index_js_2 = require("./routes/review/index.js");
const security_js_1 = require("./middleware/security.js");
const rbac_manager_js_1 = require("../../../packages/authentication/src/rbac/rbac-manager.js");
const sink_js_1 = require("../../../server/src/audit/sink.js");
function buildApp(dependencies = {}) {
    const app = (0, express_1.default)();
    app.app = app;
    const rbacManager = dependencies.rbacManager ?? new rbac_manager_js_1.RBACManager();
    const sink = dependencies.auditSink ?? sink_js_1.auditSink;
    rbacManager.initializeDefaultRoles();
    rbacManager.defineRole({
        name: 'api_user',
        description: 'Default API consumer with read-only capabilities',
        permissions: [
            { resource: 'epics', action: 'read' },
            { resource: 'receipts', action: 'read' },
        ],
    });
    rbacManager.defineRole({
        name: 'epic_contributor',
        description: 'Can manage epic tasks',
        permissions: [
            { resource: 'epics', action: 'read' },
            { resource: 'epics', action: 'update' },
        ],
    });
    rbacManager.defineRole({
        name: 'review_moderator',
        description: 'Can review and decide',
        permissions: [
            { resource: 'review', action: 'read' },
            { resource: 'review', action: 'decide' },
        ],
    });
    rbacManager.defineRole({
        name: 'receipt_reader',
        description: 'Can fetch receipt details',
        permissions: [{ resource: 'receipts', action: 'read' }],
    });
    rbacManager.defineRole({
        name: 'action_operator',
        description: 'Can preflight and execute privileged actions',
        permissions: [
            { resource: 'actions:preflight', action: 'evaluate' },
            { resource: 'actions:execute', action: 'invoke' },
        ],
    });
    // Apply security headers to all routes
    app.use((0, security_js_1.securityHeaders)());
    // Apply global rate limiting
    app.use(security_js_1.apiRateLimiter);
    app.use(express_1.default.json());
    // Health check endpoint (no auth required)
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', service: 'api' });
    });
    // All routes below require authentication
    app.use((0, security_js_1.requireAuth)(rbacManager));
    app.use((0, security_js_1.requireTenantIsolation)());
    const epicService = dependencies.epicService ?? new EpicService_js_1.EpicService();
    app.use('/epics', (0, index_js_1.createEpicsRouter)({ epicService, rbacManager }));
    const reviewQueue = dependencies.reviewQueue ?? new ReviewQueueService_js_1.ReviewQueueService();
    app.use('/review', (0, index_js_2.createReviewRouter)({ queue: reviewQueue, rbacManager }));
    if (dependencies.store || dependencies.verifier) {
        app.use('/receipts', (0, get_js_1.createGetReceiptRouter)({
            ...dependencies,
            rbacManager,
        }));
    }
    // Privileged operations require tenant isolation and stricter rate limiting
    const decisionStore = dependencies.decisionStore ?? new policy_decisions_js_1.PolicyDecisionStore(() => new Date());
    const policyService = dependencies.policyService ?? new policyService_js_1.OpaPolicySimulationService();
    app.use('/actions', security_js_1.privilegedRateLimiter, (0, security_js_1.requireTenantIsolation)(), (0, preflight_js_1.createPreflightRouter)({
        decisionStore,
        policyService,
        rbacManager,
    }));
    const preflightStore = dependencies.preflightStore ?? new PolicyDecisionStore_js_1.InMemoryPolicyDecisionStore();
    const events = dependencies.events ?? new EventPublisher_js_1.EventPublisher();
    app.use('/actions', security_js_1.privilegedRateLimiter, (0, security_js_1.requireTenantIsolation)(), (0, execute_js_1.createExecuteRouter)(preflightStore, events, policyService, rbacManager, sink));
    return app;
}
