"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_js_1 = require("../../utils/auth.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('authGuard', () => {
    (0, globals_1.it)('should throw if context.user is missing', async () => {
        const resolver = globals_1.jest.fn();
        const guarded = (0, auth_js_1.authGuard)(resolver);
        await (0, globals_1.expect)(guarded({}, {}, {}, {})).rejects.toThrow('Not authenticated');
    });
    (0, globals_1.it)('should throw if tenantId is missing', async () => {
        const resolver = globals_1.jest.fn();
        const guarded = (0, auth_js_1.authGuard)(resolver);
        const context = { user: { id: '1' } };
        await (0, globals_1.expect)(guarded({}, {}, context, {})).rejects.toThrow('Tenant context missing');
    });
    (0, globals_1.it)('should call resolver if authorized', async () => {
        const resolver = globals_1.jest.fn().mockReturnValue('success');
        const guarded = (0, auth_js_1.authGuard)(resolver);
        const context = { user: { id: '1', tenantId: 't1' } };
        const result = await guarded({}, {}, context, {});
        (0, globals_1.expect)(result).toBe('success');
        (0, globals_1.expect)(resolver).toHaveBeenCalled();
    });
    (0, globals_1.it)('should check permissions if required', async () => {
        const resolver = globals_1.jest.fn().mockReturnValue('success');
        const guarded = (0, auth_js_1.authGuard)(resolver, 'read:entities');
        const context = {
            user: {
                id: '1',
                tenantId: 't1',
                permissions: ['read:entities']
            }
        };
        await (0, globals_1.expect)(guarded({}, {}, context, {})).resolves.toBe('success');
    });
    (0, globals_1.it)('should deny if permission missing', async () => {
        const resolver = globals_1.jest.fn();
        const guarded = (0, auth_js_1.authGuard)(resolver, 'write:entities');
        const context = {
            user: {
                id: '1',
                tenantId: 't1',
                permissions: ['read:entities']
            }
        };
        await (0, globals_1.expect)(guarded({}, {}, context, {})).rejects.toThrow('Missing permission');
    });
});
