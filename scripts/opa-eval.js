"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaEval = opaEval;
const child_process_1 = require("child_process");
async function opaEval(input) {
    return new Promise((res, rej) => {
        const p = (0, child_process_1.spawn)('opa', ['eval', '-f', 'values', '-I', '-d', 'policy/'], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        p.stdin.write(JSON.stringify(input));
        p.stdin.end();
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        let err = '';
        p.stderr.on('data', (d) => (err += d));
        p.on('close', (c) => (c ? rej(new Error(err || 'opa failed')) : res(out)));
    });
}
