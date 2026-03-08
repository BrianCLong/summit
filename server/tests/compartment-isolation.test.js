"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const withAuthAndPolicy_js_1 = require("../src/middleware/withAuthAndPolicy.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('compartment-aware investigation isolation', () => {
    const baseUser = {
        id: 'u1',
        email: 'user@example.com',
        roles: ['analyst'],
        permissions: [],
        orgId: 'org-1',
        teamId: 'team-1',
    };
    (0, globals_1.it)('allows access within same org and team', async () => {
        const resolver = (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({
            type: 'investigation',
            id: 'inv-1',
            orgId: 'org-1',
            teamId: 'team-1',
        }))(async () => 'ok');
        const result = await resolver({}, {}, { user: baseUser }, { fieldName: 'test', path: 'testPath' });
        (0, globals_1.expect)(result).toBe('ok');
    });
    (0, globals_1.it)('denies access when org differs', async () => {
        const resolver = (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({
            type: 'investigation',
            id: 'inv-1',
            orgId: 'org-2',
        }))(async () => 'ok');
        await (0, globals_1.expect)(resolver({}, {}, { user: baseUser }, { fieldName: 'test', path: 'testPath' })).rejects.toThrow(apollo_server_express_1.ForbiddenError);
    });
    (0, globals_1.it)('denies access when team differs', async () => {
        const resolver = (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({
            type: 'investigation',
            id: 'inv-1',
            orgId: 'org-1',
            teamId: 'team-2',
        }))(async () => 'ok');
        await (0, globals_1.expect)(resolver({}, {}, { user: baseUser }, { fieldName: 'test', path: 'testPath' })).rejects.toThrow(apollo_server_express_1.ForbiddenError);
    });
});
