import crypto from 'crypto';
import fs from 'fs';
const comp = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dig =
  'sha256:' +
  crypto
    .createHash('sha256')
    .update(JSON.stringify({ ...comp, digest: undefined }))
    .digest('hex');
if (dig !== comp.digest) {
  console.error('digest mismatch');
  process.exit(1);
}
console.log('digest ok'); // then `cosign verify-attestation` in CI (bash)
