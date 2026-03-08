"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const crypto_1 = __importDefault(require("crypto"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// This smoke test verifies that the CLI tool can verify a manifest
// It generates a dummy manifest and runs the CLI against it
async function runTest() {
    const manifestPath = path_1.default.join(__dirname, 'test-manifest.json');
    const cliPath = path_1.default.join(__dirname, '../../../../cli/prov-verify/index.js');
    const keyPath = path_1.default.join(__dirname, 'test_public_key.pem');
    const privateKeyPath = path_1.default.join(__dirname, 'test_private_key.pem');
    let exitCode = 0;
    console.log('Running Provenance Ledger Smoke Test...');
    try {
        // --- Setup Keys ---
        const { privateKey, publicKey } = crypto_1.default.generateKeyPairSync('ed25519', {
            privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
            publicKeyEncoding: { format: 'pem', type: 'spki' },
        });
        fs_1.default.writeFileSync(keyPath, publicKey);
        fs_1.default.writeFileSync(privateKeyPath, privateKey);
        // --- Setup Manifest ---
        const hash1 = 'hash1';
        const hash2 = 'hash2';
        const joined = hash1 + hash2;
        const chain = crypto_1.default.createHash('sha256').update(joined).digest('hex');
        // Sign chain
        const signatureBuffer = crypto_1.default.sign(null, Buffer.from(chain), privateKey);
        const signature = signatureBuffer.toString('base64');
        const manifest = {
            version: '1.0',
            generatedAt: new Date().toISOString(),
            claims: [
                { id: '1', hash: hash1, transforms: [] },
                { id: '2', hash: hash2, transforms: [] }
            ],
            hashChain: chain,
            signature: signature
        };
        fs_1.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        // --- Test 1: Valid Manifest with Key ---
        console.log('Test 1: Verifying valid manifest with signature...');
        await new Promise((resolve, reject) => {
            const cli = (0, child_process_1.spawn)('node', [cliPath, 'verify', manifestPath, '--key', keyPath, '--verbose']);
            let stdout = '';
            let stderr = '';
            cli.stdout.on('data', d => stdout += d);
            cli.stderr.on('data', d => stderr += d);
            cli.on('close', (code) => {
                if (code === 0 && stdout.includes('✅ PASS')) {
                    console.log('✅ Test 1 Passed');
                    resolve();
                }
                else {
                    console.error('❌ Test 1 Failed');
                    console.error('STDOUT:', stdout);
                    console.error('STDERR:', stderr);
                    reject(new Error('Test 1 Failed'));
                }
            });
        });
        // --- Test 2: Tampered Hash ---
        console.log('Test 2: Verifying tampered hash...');
        const tamperedManifest = { ...manifest, hashChain: 'bad_hash' };
        const tamperedPath = path_1.default.join(__dirname, 'tampered-manifest.json');
        fs_1.default.writeFileSync(tamperedPath, JSON.stringify(tamperedManifest));
        await new Promise((resolve, reject) => {
            const cli = (0, child_process_1.spawn)('node', [cliPath, 'verify', tamperedPath, '--key', keyPath]);
            let stdout = '';
            let stderr = '';
            cli.stdout.on('data', d => stdout += d);
            cli.stderr.on('data', d => stderr += d);
            cli.on('close', (code) => {
                fs_1.default.unlinkSync(tamperedPath);
                if (code === 1) { // Expect failure code
                    console.log('✅ Test 2 Passed (Hash Check Failed)');
                    resolve();
                }
                else {
                    console.error('❌ Test 2 Failed (Should fail hash check)');
                    console.error('STDOUT:', stdout);
                    console.error('STDERR:', stderr);
                    reject(new Error('Test 2 Failed'));
                }
            });
        });
        // --- Test 3: Invalid Signature ---
        console.log('Test 3: Verifying invalid signature...');
        // Create new keypair for attacker
        const { privateKey: badPriv } = crypto_1.default.generateKeyPairSync('ed25519', {
            privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
            publicKeyEncoding: { format: 'pem', type: 'spki' },
        });
        const badSigBuffer = crypto_1.default.sign(null, Buffer.from(chain), badPriv);
        const badSig = badSigBuffer.toString('base64');
        const badSigManifest = { ...manifest, signature: badSig };
        const badSigPath = path_1.default.join(__dirname, 'badsig-manifest.json');
        fs_1.default.writeFileSync(badSigPath, JSON.stringify(badSigManifest));
        await new Promise((resolve, reject) => {
            const cli = (0, child_process_1.spawn)('node', [cliPath, 'verify', badSigPath, '--key', keyPath]);
            let stdout = '';
            let stderr = '';
            cli.stdout.on('data', d => stdout += d);
            cli.stderr.on('data', d => stderr += d);
            cli.on('close', (code) => {
                fs_1.default.unlinkSync(badSigPath);
                if (code === 1) {
                    console.log('✅ Test 3 Passed (Signature Check Failed)');
                    resolve();
                }
                else {
                    console.error('❌ Test 3 Failed (Should fail signature check)');
                    console.error('STDOUT:', stdout);
                    console.error('STDERR:', stderr);
                    reject(new Error('Test 3 Failed'));
                }
            });
        });
    }
    catch (error) {
        console.error('Test Suite Failed:', error);
        exitCode = 1;
    }
    finally {
        if (fs_1.default.existsSync(manifestPath))
            fs_1.default.unlinkSync(manifestPath);
        if (fs_1.default.existsSync(keyPath))
            fs_1.default.unlinkSync(keyPath);
        if (fs_1.default.existsSync(privateKeyPath))
            fs_1.default.unlinkSync(privateKeyPath);
        process.exit(exitCode);
    }
}
runTest();
