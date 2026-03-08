"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCNB = buildCNB;
async function buildCNB({ image, path, }) {
    await run('pack', [
        'build',
        image,
        '--builder',
        'paketobuildpacks/builder-jammy-base',
        '--path',
        path,
        '--publish',
    ]);
}
function run(cmd, args) {
    return new Promise((res, rej) => require('child_process').execFile(cmd, args, (e) => (e ? rej(e) : res())));
}
