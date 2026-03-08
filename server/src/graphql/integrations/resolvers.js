"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationsResolvers = void 0;
const n8n_policy_js_1 = require("../../integrations/n8n-policy.js");
exports.integrationsResolvers = {
    Query: {
        n8nAllowed: async () => (0, n8n_policy_js_1.listAllowedN8nFlows)(),
    },
};
