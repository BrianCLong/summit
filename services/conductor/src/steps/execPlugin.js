"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execPlugin = void 0;
const cache_1 = require("../cache/cache");
const runner_1 = require("../wasm/runner"); // Assuming runWasm is from here
exports.execPlugin = {
    async withDigest(ctx, step, plugin, inputs, params, env, options) {
        const key = (0, cache_1.stepCacheKey)({
            pluginDigest: plugin.digest,
            inputDigests: inputs,
            params,
        });
        const cached = await (0, cache_1.getCached)(key);
        if (cached) {
            await ctx.attachArtifacts(cached);
            ctx.log('info', 'cache.hit', { key });
            return;
        }
        // Placeholder for actual plugin execution logic
        // This would typically involve fetching the plugin by digest,
        // providing inputs, and running it in a sandboxed environment.
        // For now, I'll use a dummy runWasm call.
        const res = await (0, runner_1.runWasm)({
            wasmPath: 'path/to/plugin.wasm',
            args: [],
            env: env,
            caps: {},
            limits: {},
        }); // Dummy call, needs actual implementation
        await (0, cache_1.putCached)(key, res.artifacts);
        await ctx.attachArtifacts(res.artifacts);
    },
};
