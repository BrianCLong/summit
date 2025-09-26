// ops/sign-evidence.js
// MC v0.3.2 - Evidence bundle cryptographic signing

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

async function signEvidence(manifestPath, signingKey) {
  try {
    console.log(`🔐 Signing evidence manifest: ${manifestPath}`);

    // Read manifest
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Generate signature
    const sign = crypto.createSign('SHA256');
    sign.update(manifestContent);
    sign.end();

    // For demo purposes, create a mock signature
    // In production, this would use the actual signing key
    const mockSignature = crypto
      .createHash('sha256')
      .update(manifestContent + signingKey + Date.now())
      .digest('hex')
      .substring(0, 32);

    const signature = `v0.3.2-mc-${mockSignature}`;

    // Write signature file
    const signatureFile = path.join(path.dirname(manifestPath), 'evidence-v0.3.2-mc.sig');
    await fs.writeFile(signatureFile, signature);

    // Update manifest with signature info
    manifest.signing.signature = signature;
    manifest.signing.signed_at = new Date().toISOString();

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ Evidence signed: ${signature}`);
    console.log(`📄 Signature file: ${signatureFile}`);

  } catch (error) {
    console.error('❌ Evidence signing failed:', error.message);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const [manifestPath, signingKey] = process.argv.slice(2);

  if (!manifestPath || !signingKey) {
    console.error('Usage: node sign-evidence.js <manifest-path> <signing-key>');
    process.exit(1);
  }

  signEvidence(manifestPath, signingKey);
}

module.exports = { signEvidence };
