import { promises as fs } from 'fs';
import { WASI } from 'wasi';

type WasmCaps = {
  network?: boolean;
  fs?: boolean;
  cpuMs?: number;
  memMb?: number;
};

export async function runWasmStep(
  wasmPath: string,
  input: unknown,
  caps: WasmCaps = {},
) {
  // Enforce simple capability gates by not wiring imports for FS/NET (default off)
  const wasi = new WASI({
    args: [],
    env: {},
    preopens: caps.fs ? { '/': '/' } : {},
  });
  const bin = await fs.readFile(wasmPath);
  // @ts-ignore Node 20 has global WebAssembly
  const mod = await WebAssembly.compile(bin);
  // @ts-ignore
  const inst = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: (wasi as any).wasiImport,
  });
  const deadline =
    Date.now() + (caps.cpuMs || Number(process.env.WASM_MAX_CPU_MS || 5000));
  const memLimit =
    (caps.memMb || Number(process.env.WASM_MAX_MEM_MB || 256)) * 1024 * 1024;

  const guard = setInterval(() => {
    // @ts-ignore
    const m = inst.exports?.memory as WebAssembly.Memory | undefined;
    if (m && m.buffer.byteLength > memLimit) throw new Error('wasm OOM');
    if (Date.now() > deadline) throw new Error('wasm timeout');
  }, 50);

  try {
    // @ts-ignore
    wasi.start(inst as any);
    // Convention: export_json(ptr) returns a pointer to a NUL-terminated JSON string
    // @ts-ignore
    const exportJson = inst.exports?.['export_json'] as Function | undefined;
    if (typeof exportJson !== 'function')
      throw new Error('missing export_json()');
    // Pass input via memory: simple approach, let plugin read from stdin or global if needed.
    const resPtr = exportJson(JSON.stringify(input));
    // @ts-ignore
    const mem = new Uint8Array(inst.exports.memory.buffer);
    const out = decodeCString(mem, resPtr as number);
    return JSON.parse(out);
  } finally {
    clearInterval(guard);
  }
}

function decodeCString(mem: Uint8Array, ptr: number) {
  let end = ptr;
  while (mem[end] !== 0) end++;
  return new TextDecoder().decode(mem.slice(ptr, end));
}
