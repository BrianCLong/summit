"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWasm = runWasm;
const fs_1 = __importDefault(require("fs"));
async function runWasm(path, input) {
    const wasm = await WebAssembly.instantiate(fs_1.default.readFileSync(path), {
        env: {
            // expose minimal host functions
            log: (p, len) => {
                /* copy from memory and log */
            },
        },
    });
    const { memory, main } = wasm.instance.exports;
    const inPtr = 1024;
    new Uint8Array(memory.buffer, inPtr, input.length).set(input);
    const outPtr = main(inPtr, input.length); // return pointer/len scheme
    const len = new DataView(memory.buffer).getUint32(outPtr, true);
    return new Uint8Array(memory.buffer, outPtr + 4, len);
}
