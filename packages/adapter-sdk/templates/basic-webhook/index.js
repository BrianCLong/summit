"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definition = void 0;
exports.definition = {
    name: 'webhook-sink',
    version: '0.1.0',
    capabilities: ['webhook'],
    requiredPermissions: ['adapter:webhook:emit'],
    lifecycle: {
        run: async (request) => {
            // placeholder: a real implementation would POST to an external endpoint
            return {
                result: { delivered: true },
                durationMs: 0,
                retries: 0,
            };
        },
    },
};
