import { stepCacheKey, getCached, putCached } from '../cache/cache';
import { runWasm } from '../wasm/runner'; // Assuming runWasm is from here

export const execPlugin = {
  async withDigest(
    ctx: any,
    step: any,
    plugin: { digest: string },
    inputs: string[],
    params: any,
    env: Record<string, string>,
    options: { deterministic: boolean },
  ) {
    const key = stepCacheKey({
      pluginDigest: plugin.digest,
      inputDigests: inputs,
      params,
    });
    const cached = await getCached(key);
    if (cached) {
      await ctx.attachArtifacts(cached);
      ctx.log('info', 'cache.hit', { key });
      return;
    }

    // Placeholder for actual plugin execution logic
    // This would typically involve fetching the plugin by digest,
    // providing inputs, and running it in a sandboxed environment.
    // For now, I'll use a dummy runWasm call.
    const res = await runWasm({
      wasmPath: 'path/to/plugin.wasm',
      args: [],
      env: env,
      caps: {},
      limits: {},
    }); // Dummy call, needs actual implementation

    await putCached(key, res.artifacts);
    await ctx.attachArtifacts(res.artifacts);
  },
};
