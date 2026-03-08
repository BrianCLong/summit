"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_js_1 = require("../src/lib/auth.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('trace context', () => {
    (0, globals_1.it)('attaches unique requestId to context', async () => {
        const ctx1 = await (0, auth_js_1.getContext)({ req: { headers: {} } });
        const ctx2 = await (0, auth_js_1.getContext)({ req: { headers: {} } });
        (0, globals_1.expect)(ctx1.requestId).toBeDefined();
        (0, globals_1.expect)(ctx2.requestId).toBeDefined();
        (0, globals_1.expect)(ctx1.requestId).not.toBe(ctx2.requestId);
    });
});
