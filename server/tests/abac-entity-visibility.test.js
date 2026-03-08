"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const withAuthAndPolicy_js_1 = require("../src/middleware/withAuthAndPolicy.js");
const apollo_server_express_1 = require("apollo-server-express");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('mission tag and temporal ABAC', () => {
    const baseUser = {
        id: 'u1',
        email: 'user@example.com',
        roles: ['analyst'],
        permissions: [],
        orgId: 'org-1',
        teamId: 'team-1',
        missionTags: ['alpha', 'bravo'],
    };
    (0, globals_1.it)('allows entity access with matching mission tag and valid time', async () => {
        const resolver = (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({
            type: 'entity',
            id: 'e1',
            orgId: 'org-1',
            teamId: 'team-1',
            missionTags: ['alpha'],
            validFrom: new Date(Date.now() - 1000).toISOString(),
            validTo: new Date(Date.now() + 1000).toISOString(),
        }))(async () => 'ok');
        const result = await resolver({}, {}, { user: baseUser, req: {} }, { fieldName: 'test', path: 'testPath' });
        (0, globals_1.expect)(result).toBe('ok');
    });
    (0, globals_1.it)('denies entity access when mission tag mismatch', async () => {
        const resolver = (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({
            type: 'entity',
            id: 'e1',
            orgId: 'org-1',
            teamId: 'team-1',
            missionTags: ['charlie'],
        }))(async () => 'ok');
        await (0, globals_1.expect)(resolver({}, {}, { user: baseUser, req: {} }, { fieldName: 'test', path: 'testPath' })).rejects.toThrow(apollo_server_express_1.ForbiddenError);
    });
    (0, globals_1.it)('denies entity access outside valid time window', async () => {
        const resolver = (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({
            type: 'entity',
            id: 'e1',
            orgId: 'org-1',
            teamId: 'team-1',
            missionTags: ['alpha'],
            validFrom: new Date(Date.now() + 10000).toISOString(),
        }))(async () => 'ok');
        await (0, globals_1.expect)(resolver({}, {}, { user: baseUser, req: {} }, { fieldName: 'test', path: 'testPath' })).rejects.toThrow(apollo_server_express_1.ForbiddenError);
    });
});
