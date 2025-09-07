import { spawn } from "child_process";
export function runWithWasmtime(wasmPath:string, caps:any, limits:any, env:Record<string,string>){
  const args = ["run", "--dir=.", `--max-mem=${limits.memMiB||64}MiB`, wasmPath];
  return new Promise((res)=> {
    const p = spawn("wasmtime", args, { env: filterEnv(env, caps.env||[]) });
    let out=""; p.stdout.on("data",(d)=>out+=d.toString());
    p.on("close", (code)=> res({ code, stdout: out }));
  });
}
function filterEnv(env:Record<string,string>, allow:string[]){ const out:any={}; for (const [k,v] of Object.entries(env)) if (allow.some(p => new RegExp("^"+p.replace("*",".*")+"$").test(k))) out[k]=v; return out; }