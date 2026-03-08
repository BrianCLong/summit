"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter = {
    metadata: {
        name: 'sample-basic-webhook',
        version: '0.1.0',
        description: 'Sample adapter used for contract harness validation',
        capabilities: ['webhook']
    },
    async handleEvent(event, context) {
        const payload = typeof event.payload === 'object' && event.payload
            ? event.payload
            : {};
        const message = 'Prepared webhook payload with contextual authentication headers';
        return {
            status: 'ok',
            message,
            data: {
                target: payload.url ?? 'https://example.test/webhook',
                method: payload.method ?? 'POST',
                body: payload.body ?? { ping: true },
                headers: context.secrets?.authToken
                    ? { Authorization: `Bearer ${context.secrets.authToken}` }
                    : {}
            }
        };
    }
};
exports.default = adapter;
