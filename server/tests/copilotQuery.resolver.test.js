"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolvers_copilot_js_1 = require("../src/graphql/resolvers.copilot.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('copilot resolvers', () => {
    (0, globals_1.it)('exposes preview and execute resolvers', () => {
        (0, globals_1.expect)(typeof resolvers_copilot_js_1.copilotResolvers.Query.previewNLQuery).toBe('function');
        (0, globals_1.expect)(typeof resolvers_copilot_js_1.copilotResolvers.Query.executeNLQuery).toBe('function');
    });
});
