"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definition = void 0;
exports.definition = {
    name: 'reference-oidc-scim',
    version: '0.1.0',
    capabilities: ['identity'],
    requiredPermissions: ['adapter:identity:sync'],
    claims: ['oidc', 'scim'],
    lifecycle: {
        run: async (request) => {
            // Stub: real implementation would call SCIM APIs using OIDC tokens.
            return {
                result: { success: true },
                durationMs: 0,
                retries: 0,
            };
        },
    },
};
