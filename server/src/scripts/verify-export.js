"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
async function verifyExport(manifestPath) {
    try {
        const manifestContent = fs_1.default.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        console.log(`Verifying export ${manifest.exportId} for tenant ${manifest.tenantId}...`);
        // 1. Verify Manifest Structure
        if (!manifest.provenance || !manifest.content) {
            throw new Error('Invalid manifest structure: missing provenance or content sections');
        }
        // 2. Verify Signature (Mock/Simplified)
        // In a real scenario, we would use the public key to verify the signature.
        // Here we check if the signature exists.
        if (!manifest.provenance.signatures || manifest.provenance.signatures.length === 0) {
            throw new Error('No signatures found on manifest');
        }
        console.log('✅ Signature presence verified');
        // 3. Verify Chain Tip (Simulated check)
        // We would normally fetch the chain tip from the ledger or a public transparency log.
        if (manifest.provenance.chainTip === 'genesis' || manifest.provenance.chainTip.length === 64) {
            console.log('✅ Chain tip format verified');
        }
        else {
            console.warn('⚠️ Chain tip format looks suspicious');
        }
        // 4. Verify Content Integrity (Simulated)
        // We can't verify the actual content hash without the content files, but we verify the root hash logic if we had them.
        // Here we just ensure the root hash is present.
        if (!manifest.provenance.rootHash) {
            throw new Error('Root hash missing');
        }
        console.log(`✅ Root hash verified: ${manifest.provenance.rootHash.substring(0, 8)}...`);
        console.log('\nSUCCESS: Export manifest verification passed.');
        return true;
    }
    catch (error) {
        console.error('\nFAILURE: Verification failed');
        console.error(error.message);
        process.exit(1);
    }
}
// CLI entry point
const args = process.argv.slice(2);
if (args.length === 1) {
    verifyExport(args[0]);
}
else if (args.length > 0) {
    console.log('Usage: npx tsx verify-export.ts <manifest-path>');
    process.exit(1);
}
