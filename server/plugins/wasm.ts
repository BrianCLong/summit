import fs from 'fs';
export async function runWasm(path: string, input: Uint8Array) {
  const wasm = await WebAssembly.instantiate(fs.readFileSync(path), {
    env: {
      // expose minimal host functions
      log: (p: number, len: number) => {
        /* copy from memory and log */
      },
    },
  } as any);
  const { memory, main } = wasm.instance.exports as any;
  const inPtr = 1024;
  new Uint8Array(memory.buffer, inPtr, input.length).set(input);
  const outPtr = main(inPtr, input.length); // return pointer/len scheme
  const len = new DataView(memory.buffer).getUint32(outPtr, true);
  return new Uint8Array(memory.buffer, outPtr + 4, len);
}
