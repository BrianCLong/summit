"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bake = bake;
const child_process_1 = require("child_process");
function bake(to, context, addr) {
    (0, child_process_1.execFileSync)('docker', [
        'buildx',
        'create',
        '--driver',
        'remote',
        '--name',
        'bk',
        '--endpoint',
        addr,
    ], { stdio: 'inherit' });
    (0, child_process_1.execFileSync)('docker', ['buildx', 'use', 'bk'], { stdio: 'inherit' });
    (0, child_process_1.execFileSync)('docker', ['buildx', 'build', '--push', '-t', to, context], {
        stdio: 'inherit',
    });
}
