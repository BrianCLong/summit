"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.introspect = introspect;
exports.oidcLogin = oidcLogin;
const audit_1 = require("./audit");
const oidc_1 = require("./oidc");
const session_1 = require("./session");
function getUsers() {
    const users = {};
    const username = process.env.AUTHZ_DEMO_USERNAME;
    const password = process.env.AUTHZ_DEMO_PASSWORD;
    if (username && password) {
        users[username] = {
            username,
            password,
            sub: username,
            tenantId: 'tenantA',
            roles: ['reader'],
            clearance: 'confidential',
        };
    }
    return users;
}
async function login(username, password) {
    const users = getUsers();
    const user = users[username];
    if (!user || user.password !== password) {
        throw new Error('invalid_credentials');
    }
    const token = await session_1.sessionManager.createSession({
        sub: user.sub,
        tenantId: user.tenantId,
        roles: user.roles,
        clearance: user.clearance,
        acr: 'loa1',
        amr: ['pwd'],
    });
    await (0, audit_1.log)({
        subject: user.sub,
        action: 'login',
        resource: 'self',
        tenantId: user.tenantId,
        allowed: true,
        reason: 'login',
    });
    return token;
}
async function introspect(token) {
    const { payload } = await session_1.sessionManager.validate(token);
    return payload;
}
async function oidcLogin(idToken) {
    const payload = await (0, oidc_1.verifyOidcToken)(idToken);
    if (!payload.sub) {
        throw new Error('missing_subject');
    }
    (0, oidc_1.assertMfa)(payload);
    const sessionToken = await session_1.sessionManager.createSession({
        ...payload,
        sub: String(payload.sub),
        acr: payload.acr || (payload.amr?.includes('hwk') ? 'loa2' : 'loa1'),
        amr: payload.amr || ['pwd'],
    });
    await (0, audit_1.log)({
        subject: String(payload.sub),
        action: 'oidc_login',
        resource: 'self',
        tenantId: payload.tenantId || 'unknown',
        allowed: true,
        reason: 'oidc_login',
    });
    return sessionToken;
}
