"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityCommentAccessError = void 0;
exports.createEntityCommentAuthorizer = createEntityCommentAuthorizer;
const logger_js_1 = __importDefault(require("../../config/logger.js"));
class EntityCommentAccessError extends Error {
    status = 403;
    code = 'access_denied';
    constructor(message) {
        super(message);
        this.name = 'EntityCommentAccessError';
    }
}
exports.EntityCommentAccessError = EntityCommentAccessError;
function createEntityCommentAuthorizer(opaClient) {
    const authzLogger = logger_js_1.default.child({ name: 'EntityCommentAccess' });
    return async function assertEntityCommentAccess(request) {
        const allowed = await opaClient.checkDataAccess(request.userId, request.tenantId, 'entity_comment', request.action);
        authzLogger.info({
            allowed,
            userId: request.userId,
            tenantId: request.tenantId,
            entityId: request.entityId,
            action: request.action,
        }, 'Entity comment access decision evaluated');
        if (!allowed) {
            throw new EntityCommentAccessError(`Access denied for action ${request.action}`);
        }
    };
}
