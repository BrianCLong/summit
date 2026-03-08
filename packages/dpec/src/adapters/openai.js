"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenAIChatAdapter = createOpenAIChatAdapter;
const hash_js_1 = require("../hash.js");
function defaultKey(request) {
    const tokenizerSource = request.tokenizer ?? request.model;
    const params = buildParams(request);
    return {
        modelHash: (0, hash_js_1.sha256)(request.model),
        tokenizerHash: (0, hash_js_1.sha256)(tokenizerSource),
        params,
        toolsGraphHash: (0, hash_js_1.sha256)((0, hash_js_1.stableStringify)(request.tools ?? [])),
        promptHash: (0, hash_js_1.sha256)((0, hash_js_1.stableStringify)(request.messages))
    };
}
function buildParams(request) {
    const params = {};
    const candidate = [
        ['temperature', 'temperature'],
        ['top_p', 'top_p'],
        ['max_tokens', 'max_tokens'],
        ['frequency_penalty', 'frequency_penalty'],
        ['presence_penalty', 'presence_penalty'],
        ['stop', 'stop'],
        ['seed', 'seed'],
        ['response_format', 'response_format']
    ];
    for (const [key, alias] of candidate) {
        const value = request[key];
        if (value !== undefined) {
            params[alias] = value;
        }
    }
    return params;
}
function createOpenAIChatAdapter(options) {
    const derive = options.deriveKey ?? defaultKey;
    return async (request) => {
        const key = derive(request);
        const result = await options.cache.resolve(key, async () => {
            const response = await options.client.chat.completions.create(request);
            return {
                artifact: JSON.stringify(response),
                metadata: {
                    adapter: 'openai.chat.completions',
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
