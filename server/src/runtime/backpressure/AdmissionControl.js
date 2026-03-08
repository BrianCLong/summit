"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.admissionControl = void 0;
const BackpressureController_js_1 = require("./BackpressureController.js");
/**
 * Middleware to enforce admission control.
 */
const admissionControl = async (req, res, next) => {
    const controller = BackpressureController_js_1.BackpressureController.getInstance();
    // Determine priority based on route or headers
    let priority = BackpressureController_js_1.PriorityClass.NORMAL;
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/health')) {
        priority = BackpressureController_js_1.PriorityClass.CRITICAL;
    }
    else if (req.path.startsWith('/api/analytics') || req.path.startsWith('/api/reporting')) {
        priority = BackpressureController_js_1.PriorityClass.BEST_EFFORT;
    }
    // Tenant ID for attribution (if needed later)
    const tenantId = req.user?.tenantId || 'anonymous';
    const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
    try {
        const result = await controller.requestAdmission({
            id: requestId,
            tenantId,
            priority,
        });
        if (result.allowed) {
            // Hook into response finish to release slot
            res.on('finish', () => {
                controller.release(requestId);
            });
            res.on('close', () => {
                controller.release(requestId);
            });
            next();
        }
        else {
            res.status(503).json({
                error: 'Service Unavailable',
                message: result.reason || 'Server is under heavy load',
                retryAfter: result.waitMs ? Math.ceil(result.waitMs / 1000) : 5
            });
        }
    }
    catch (err) {
        console.error('Admission control error', err);
        res.status(500).send('Internal Server Error');
    }
};
exports.admissionControl = admissionControl;
