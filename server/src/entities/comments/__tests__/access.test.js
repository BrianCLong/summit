"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const access_js_1 = require("../access.js");
(0, globals_1.describe)('entity comment ABAC authorizer', () => {
    (0, globals_1.it)('allows access when OPA approves', async () => {
        const checkDataAccess = globals_1.jest.fn(async () => true);
        const authorizer = (0, access_js_1.createEntityCommentAuthorizer)({
            checkDataAccess,
        });
        await (0, globals_1.expect)(authorizer({
            userId: 'user-1',
            tenantId: 'tenant-1',
            entityId: 'entity-1',
            action: 'comment:read',
        })).resolves.toBeUndefined();
        (0, globals_1.expect)(checkDataAccess).toHaveBeenCalledWith('user-1', 'tenant-1', 'entity_comment', 'comment:read');
    });
    (0, globals_1.it)('denies access when OPA rejects', async () => {
        const authorizer = (0, access_js_1.createEntityCommentAuthorizer)({
            checkDataAccess: async () => false,
        });
        await (0, globals_1.expect)(authorizer({
            userId: 'user-2',
            tenantId: 'tenant-2',
            entityId: 'entity-2',
            action: 'comment:write',
        })).rejects.toBeInstanceOf(access_js_1.EntityCommentAccessError);
    });
});
