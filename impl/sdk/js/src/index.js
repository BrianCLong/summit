"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitClient = void 0;
class SummitClient {
    apiKey;
    endpoint;
    constructor(opts = {}) {
        this.apiKey = opts.apiKey;
        this.endpoint = opts.endpoint ?? "local";
    }
    model(name, policy) {
        const endpoint = this.endpoint;
        const apiKey = this.apiKey;
        return {
            chat: (params) => {
                const payload = {
                    model: name,
                    ...params,
                    policy: params.policy ?? policy,
                };
                // Minimal mock transport for v0.1
                return {
                    text: `[mock:${name}] ${params.messages.at(-1)?.content ?? ""}`,
                    endpoint,
                    policy: payload.policy,
                    apiKey: apiKey ? "provided" : "not-set",
                };
            },
        };
    }
    rag = {
        knowledgeBase: ({ profile }) => ({
            retrieve: (query, opts = {}) => ({
                query,
                profile,
                k: opts.k ?? 5,
                passages: [{ content: `Mock passage for '${query}'`, score: 1.0 }],
            }),
        }),
    };
}
exports.SummitClient = SummitClient;
