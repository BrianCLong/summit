"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApprovalsRouter = buildApprovalsRouter;
const express_1 = __importDefault(require("express"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const approvals_js_1 = require("../services/approvals.js");
const http_param_js_1 = require("../utils/http-param.js");
const approvalsLogger = logger_js_1.default.child({ name: 'ApprovalsRouter' });
const resolveUserId = (req) => {
    const user = req.user;
    return user?.sub || user?.id || null;
};
const ensureApprover = (req, res, next) => {
    const role = req.user?.role;
    if (!(0, approvals_js_1.canApprove)(role)) {
        return res.status(403).json({ error: 'Approval permissions required' });
    }
    next();
};
function buildApprovalsRouter(maestro) {
    const router = express_1.default.Router();
    router.use(express_1.default.json());
    router.post('/', async (req, res, next) => {
        try {
            const requesterId = resolveUserId(req) || req.body.requesterId;
            if (!requesterId) {
                return res.status(400).json({ error: 'requesterId is required' });
            }
            const approval = await (0, approvals_js_1.createApproval)({
                requesterId,
                action: req.body.action,
                payload: req.body.payload,
                reason: req.body.reason,
                runId: req.body.runId,
            });
            res.status(201).json(approval);
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/', async (req, res, next) => {
        try {
            const role = req.user?.role;
            const userId = resolveUserId(req);
            const status = (0, http_param_js_1.firstString)(req.query.status) || undefined;
            const approvals = await (0, approvals_js_1.listApprovals)({ status });
            const visible = (0, approvals_js_1.canApprove)(role)
                ? approvals
                : approvals.filter((item) => item.requester_id === userId);
            res.json(visible);
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/:id', async (req, res, next) => {
        try {
            const approval = await (0, approvals_js_1.getApprovalById)((0, http_param_js_1.firstStringOr)(req.params.id, ''));
            if (!approval) {
                return res.status(404).json({ error: 'Approval not found' });
            }
            res.json(approval);
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/approve', ensureApprover, async (req, res, next) => {
        try {
            const approverId = resolveUserId(req);
            if (!approverId) {
                return res.status(400).json({ error: 'approverId is required' });
            }
            const approval = await (0, approvals_js_1.approveApproval)((0, http_param_js_1.firstStringOr)(req.params.id, ''), approverId, req.body?.reason);
            if (!approval) {
                return res.status(409).json({ error: 'Approval not pending or not found' });
            }
            let actionResult = null;
            if (maestro &&
                approval.action === 'maestro_run' &&
                approval.payload) {
                const payload = approval.payload;
                actionResult = await maestro.runPipeline(payload.userId || approverId, String(payload.requestText || ''));
            }
            else if (maestro &&
                approval.action === 'maestro_task_execution' &&
                approval.payload) {
                const payload = approval.payload;
                const task = await maestro.getTask(payload.taskId);
                if (task) {
                    // Re-execute the task now that it has been approved
                    // Governance flip check will allow it this time because of the manual approval record
                    actionResult = await maestro.executeTask(task);
                }
            }
            approvalsLogger.info({
                approval_id: approval.id,
                action: approval.action,
                approver: approverId,
                run_id: approval.run_id,
            }, 'Approval executed');
            res.json({ approval, actionResult });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/reject', ensureApprover, async (req, res, next) => {
        try {
            const approverId = resolveUserId(req);
            if (!approverId) {
                return res.status(400).json({ error: 'approverId is required' });
            }
            const approval = await (0, approvals_js_1.rejectApproval)((0, http_param_js_1.firstStringOr)(req.params.id, ''), approverId, req.body?.reason);
            if (!approval) {
                return res.status(409).json({ error: 'Approval not pending or not found' });
            }
            approvalsLogger.info({
                approval_id: approval.id,
                action: approval.action,
                approver: approverId,
                run_id: approval.run_id,
            }, 'Approval rejected');
            res.json({ approval });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
