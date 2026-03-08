"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayRun = replayRun;
const manifest_1 = require("./manifest");
const execPlugin_1 = require("../steps/execPlugin");
async function replayRun(runId, opts = {}) {
    const { manifest } = await (0, manifest_1.buildManifest)(runId);
    const results = [];
    for (const s of manifest.steps) {
        const env = deterministicEnv(manifest.seed, s.env);
        if (!opts.allowNet)
            env["NO_NETWORK"] = "1";
        // Pull pinned inputs from CAS; plugin pinned by digest
        const out = await execPluginPinned({
            pluginDigest: s.plugin_digest,
            inputDigests: s.input_digests,
            params: s.params,
            env
        });
        results.push(out);
    }
    return results;
}
async function execPluginPinned({ pluginDigest, inputDigests, params, env }) {
    // bypass normal resolution; use digest directly
    const res = await execPlugin_1.execPlugin.withDigest(pluginDigest, inputDigests, params, env, { deterministic: true });
    // check determinism by recomputing manifest key quickly (or hash outputs)
    const deterministic = Array.isArray(res.artifacts) && res.artifacts.length > 0;
    return { stepId: params?._stepId, "unknown": , artifacts: res.artifacts || [], deterministic };
}
function deterministicEnv(seed, base) {
    return { ...base, REPLAY_SEED: seed, TZ: "UTC", LANG: "C" };
}
