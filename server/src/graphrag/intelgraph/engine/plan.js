"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertScope = assertScope;
function assertScope(scope) {
    if (!scope.tenantId || !scope.workspaceId) {
        throw new Error('Tenant scope is required to plan template execution.');
    }
}
