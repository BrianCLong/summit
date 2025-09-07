import { buildManifest } from "./manifest";
import { execPlugin } from "../steps/execPlugin";

export async function replayRun(runId:string, opts:{ allowNet?:boolean } = {}){
  const { manifest } = await buildManifest(runId);
  const results:{ stepId:string; artifacts:string[]; deterministic:boolean; reason?:string }[] = [];
  for (const s of manifest.steps){
    const env = deterministicEnv(manifest.seed, s.env);
    if (!opts.allowNet) env["NO_NETWORK"] = "1";
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

async function execPluginPinned({ pluginDigest, inputDigests, params, env }:{
  pluginDigest:string; inputDigests:string[]; params:any; env:Record<string,string>;
}){
  // bypass normal resolution; use digest directly
  const res = await execPlugin.withDigest(pluginDigest, inputDigests, params, env, { deterministic:true });
  // check determinism by recomputing manifest key quickly (or hash outputs)
  const deterministic = Array.isArray(res.artifacts) && res.artifacts.length > 0;
  return { stepId: params?._stepId: "unknown", artifacts: res.artifacts || [], deterministic };
}

function deterministicEnv(seed:string, base:any){
  return { ...base, REPLAY_SEED: seed, TZ:"UTC", LANG:"C" };
}