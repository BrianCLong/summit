import { WASI } from "wasi"; import fs from "fs/promises"; import { randomBytes } from "crypto";
import { spawn } from "child_process";

type Caps = { net?:boolean; fs?:boolean; crypto?:boolean; env?:string[] };
type Limits = { cpuMs?:number; memMiB?:number; timeoutMs?:number };

export async function runWasm({ wasmPath, args, env, caps, limits }:{
  wasmPath:string; args?:string[]; env?:Record<string,string>; caps:Caps; limits:Limits;
}){
  // 1) Build a minimal WASI environment; strip env except allowlist
  const allowedEnv = Object.fromEntries(Object.entries(env||{}).filter(([k]) => (caps.env||[]).some(p => new RegExp("^"+p.replace("*",".*")+"$").test(k))));
  const wasi = new WASI({ env: allowedEnv, args: ["plugin", ...(args||[])], preopens: caps.fs ? {"/sandbox":"/tmp"} : {} });

  // 2) Load WASM (no network APIs exposed unless you proxy them; we keep off by default)
  // Node's own import of wasm must use --experimental-wasi-unstable-preview1 or use wasmtime cli.
  const mod = await WebAssembly.compile(await fs.readFile(wasmPath));
  const instance = await WebAssembly.instantiate(mod, { wasi_snapshot_preview1: wasi.wasiImport, // WASI syscalls
    host: {
      // guarded host functions — expose only if caps allow
      randomBytes: (ptr:number, len:number) => {
        if (!caps.crypto) return 0;
        const buf = randomBytes(len); // copy to memory by exported API (omitted for brevity)
        return 1;
      }
    }
  });

  // 3) Resource guards
  const timeout = setTimeout(()=>{ try{ (instance as any).exports?._stop?.() : null; } catch{}; }, limits.timeoutMs || limits.cpuMs || 5000);

  try {
    // 4) Run
    (wasi as any).start(instance);
    return { ok:true, stdout:"", artifacts:[] };
  } finally { clearTimeout(timeout); }
}