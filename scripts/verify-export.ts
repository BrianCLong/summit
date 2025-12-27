import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const bundlePath = process.argv[2];
if (!bundlePath) {
    console.error('Usage: tsx scripts/verify-export.ts <bundle-path>');
    process.exit(1);
}

try {
    const raw = fs.readFileSync(bundlePath, 'utf8');
    const bundle = JSON.parse(raw);
    const { manifest, signature, data } = bundle;

    console.log(`Verifying bundle: ${manifest.bundleId}`);

    // 1. Verify Content Hash
    const content = JSON.stringify(data);
    const computedHash = crypto.createHash('sha256').update(content).digest('hex');
    if (computedHash !== manifest.contentHash) {
        throw new Error(`Content hash mismatch! Manifest: ${manifest.contentHash}, Computed: ${computedHash}`);
    }
    console.log('✅ Content Hash verified');

    // 2. Verify Signature
    const publicKey = fs.readFileSync('public.pem', 'utf8');
    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(manifest));
    verify.end();

    const isValid = verify.verify(publicKey, signature, 'hex');
    if (!isValid) {
        throw new Error('Signature verification failed! Manifest may be tampered.');
    }
    console.log('✅ Signature verified');
    console.log('Bundle is valid and authentic.');

} catch (err) {
    console.error('❌ Verification Failed:', (err as Error).message);
    process.exit(1);
}
