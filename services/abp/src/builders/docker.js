"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDocker = buildDocker;
const child_process_1 = require("child_process");
async function buildDocker(ctx) {
    await run('docker', [
        'buildx',
        'build',
        '--push',
        '-t',
        ctx.image,
        ...ctx.tags.flatMap((t) => ['-t', t]),
        ctx.context,
    ]);
}
function run(cmd, args) {
    return new Promise((res, rej) => (0, child_process_1.execFile)(cmd, args, (e) => (e ? rej(e) : res())));
}
