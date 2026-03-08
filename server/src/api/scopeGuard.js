"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkScope = checkScope;
exports.requireScopes = requireScopes;
function checkScope(userScopes, scope) {
    if (userScopes.includes(scope))
        return true;
    // Check for wildcard scope
    const [resource] = scope.split(':');
    if (userScopes.includes(`${resource}:*`))
        return true;
    return false;
}
function requireScopes(userScopes, needed) {
    for (const s of needed) {
        if (!checkScope(userScopes, s)) {
            const err = new Error(`SCOPE_DENIED:${s}`);
            err.code = 'SCOPE_DENIED';
            throw err;
        }
    }
}
