"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stepup_js_1 = require("./middleware/stepup.js");
const tenant_js_1 = require("./middleware/tenant.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const public_js_1 = __importDefault(require("./routes/public.js"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/', rateLimiter_js_1.publicRateLimit, public_js_1.default);
app.use(tenant_js_1.loadTenant, rateLimiter_js_1.authenticatedRateLimit);
/**
 * Admin delete user handler - requires step-up authentication
 * This endpoint is protected by requireStepUp(2) which requires MFA confirmation
 */
async function deleteUserHandler(req, res, next) {
    try {
        const { userId } = req.body;
        if (!userId || typeof userId !== 'string') {
            res.status(400).json({ error: 'userId is required and must be a string' });
            return;
        }
        // Validate userId format to prevent injection attacks
        const userIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;
        if (!userIdPattern.test(userId)) {
            res.status(400).json({ error: 'Invalid userId format' });
            return;
        }
        // IMPLEMENTATION PENDING: User deletion requires database service integration
        // Required steps once UserService and AuditService are available:
        // 1. await context.requirePermission('user:delete')
        // 2. const targetUser = await UserService.findById(userId)
        // 3. await UserService.softDelete(userId, { deletedBy: req.user.id })
        // 4. await AuditService.log('USER_DELETED', { userId, adminId: req.user.id })
        // 5. await SessionService.revokeAllForUser(userId)
        res.status(501).json({
            error: 'User deletion not yet implemented',
            message: 'This endpoint requires integration with UserService, AuditService, and SessionService',
        });
    }
    catch (error) {
        next(error);
    }
}
app.post('/admin/delete-user', (0, stepup_js_1.requireStepUp)(2), deleteUserHandler);
app.listen(3000, () => {
    console.warn('Server listening on port 3000');
});
