"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLocal = runLocal;
const child_process_1 = require("child_process");
async function runLocal(prompt) {
    return new Promise((res, rej) => {
        const p = (0, child_process_1.spawn)('./llama', ['-p', prompt, '-n', '512']);
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        p.on('close', (c) => (c ? rej(new Error('local model failed')) : res(out)));
    });
}
