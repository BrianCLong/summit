"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definition = void 0;
exports.definition = {
    name: 'reference-s3-storage',
    version: '0.1.0',
    capabilities: ['export'],
    requiredPermissions: ['adapter:storage:write'],
    claims: ['storage:s3'],
    lifecycle: {
        run: async (request) => {
            // Stub: real implementation would PUT to S3-compatible storage.
            return {
                result: { stored: true },
                durationMs: 0,
                retries: 0,
            };
        },
    },
};
