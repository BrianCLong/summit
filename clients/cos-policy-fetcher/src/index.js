"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAttestation = fetchAttestation;
exports.fetchAndVerify = fetchAndVerify;
const node_fs_1 = require("node:fs");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const undici_1 = require("undici");
const tar_1 = require("tar");
const node_child_process_1 = require("node:child_process");
function sh(cmd, args, input) {
    return new Promise((resolve) => {
        const p = (0, node_child_process_1.spawn)(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '', stderr = '';
        p.stdout.on('data', (d) => (stdout += d.toString()));
        p.stderr.on('data', (d) => (stderr += d.toString()));
        p.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
        if (input) {
            p.stdin.end(input);
        }
    });
}
async function fetchAttestation(url) {
    const { body, statusCode } = await (0, undici_1.request)(url, { method: 'GET' });
    if (statusCode !== 200) {
        throw new Error(`HTTP ${statusCode}`);
    }
    let data = '';
    for await (const chunk of body) {
        data += chunk.toString('utf8');
    }
    return data;
}
async function fetchAndVerify({ url, cosignPath = 'cosign', }) {
    const tmpdir = await node_fs_1.promises.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'policy-pack-'));
    const tarPath = node_path_1.default.join(tmpdir, 'pack.tar');
    const { body, headers, statusCode } = await (0, undici_1.request)(url, { method: 'GET' });
    if (statusCode !== 200) {
        throw new Error(`HTTP ${statusCode}`);
    }
    const digestHeader = headers['digest'];
    const bundleHeader = headers['x-cosign-bundle'];
    if (!digestHeader) {
        throw new Error('missing verification headers');
    }
    const file = (0, node_fs_1.createWriteStream)(tarPath);
    await new Promise((res, rej) => {
        body.pipe(file);
        body.on('error', rej);
        file.on('finish', () => res());
    });
    // Verify SHA-256
    const { stdout: shaOut } = await sh('sha256sum', [tarPath]);
    const sha = shaOut.trim().split(' ')[0];
    const expected = String(digestHeader).replace('sha-256=', '').trim();
    if (sha !== expected) {
        throw new Error(`digest mismatch: ${sha} != ${expected}`);
    }
    // Verify cosign bundle (offline)
    process.env.COSIGN_EXPERIMENTAL = '1';
    const attUrl = url.endsWith('/attestation') ? url : `${url}/attestation`;
    const bundle = bundleHeader
        ? String(bundleHeader)
        : await fetchAttestation(attUrl);
    const { code, stderr } = await sh(cosignPath, ['verify-blob', '--bundle', '-', tarPath], bundle);
    if (code !== 0) {
        throw new Error(`cosign verify --use-signed-timestamps failed: ${stderr}`);
    }
    // Extract to a directory and return path
    const extractDir = node_path_1.default.join(tmpdir, 'unpacked');
    await node_fs_1.promises.mkdir(extractDir, { recursive: true });
    await (0, tar_1.extract)({ file: tarPath, cwd: extractDir });
    return extractDir;
}
// Example usage when run directly
if (process.env.NODE_ENV !== 'test' && process.argv[2]) {
    fetchAndVerify({ url: process.argv[2] })
        .then((dir) => process.stdout.write(`verified pack at: ${dir}\n`))
        .catch((e) => {
        const errorMessage = e instanceof Error ? e.message : String(e);
        process.stderr.write(`${errorMessage}\n`);
        process.exit(1);
    });
}
