"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnthropicMessagesAdapter = createAnthropicMessagesAdapter;
const hash_js_1 = require("../hash.js");
function defaultKey(request) {
    const tokenizerSource = request.tokenizer ?? request.model;
    const params = buildParams(request);
    return {
        modelHash: (0, hash_js_1.sha256)(request.model),
        tokenizerHash: (0, hash_js_1.sha256)(tokenizerSource),
        params,
        toolsGraphHash: (0, hash_js_1.sha256)((0, hash_js_1.stableStringify)(request.tools ?? [])),
        promptHash: (0, hash_js_1.sha256)((0, hash_js_1.stableStringify)({
            system: request.system ?? null,
            messages: request.messages
        }))
    };
}
function buildParams(request) {
    const params = {
        max_tokens: request.max_tokens
    };
    const candidate = [
        ['temperature', 'temperature'],
        ['top_k', 'top_k'],
        ['top_p', 'top_p'],
        ['stop_sequences', 'stop_sequences']
    ];
    for (const [key, alias] of candidate) {
        const value = request[key];
        if (value !== undefined) {
            params[alias] = value;
        }
    }
    return params;
}
function createAnthropicMessagesAdapter(options) {
    const derive = options.deriveKey ?? defaultKey;
    return async (request) => {
        const key = derive(request);
        const result = await options.cache.resolve(key, async () => {
            const response = await options.client.messages.create(request);
            return {
                artifact: JSON.stringify(response),
                metadata: {
                    adapter: 'anthropic.messages.create',
                    requestDigest: (0, hash_js_1.canonicalDigest)(request)
                }
            };
        });
        const response = JSON.parse(result.artifact.toString('utf8'));
        if (result.type === 'hit') {
            return {
                response,
                hit: true,
                proof: result.proof,
                entry: result.entry
            };
        }
        return {
            response,
            hit: false,
            trace: result.trace,
            evictionProofs: result.evictionProofs,
            entry: result.entry
        };
    };
}
