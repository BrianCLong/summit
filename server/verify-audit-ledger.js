"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const worm_audit_chain_js_1 = require("./src/federal/worm-audit-chain.js");
const cryptographic_agility_1 = require("@intelgraph/cryptographic-agility");
const node_fetch_1 = __importDefault(require("node-fetch"));
async function verifyAuditBundleEndToEnd() {
    console.log('🔍 Starting End-to-End Audit Bundle Verification...');
    // 1. Initialize services
    await cryptographic_agility_1.fipsService.healthCheck();
    // 2. Add some audit entries (Internal WORM)
    console.log('📝 Adding internal audit entries...');
    await worm_audit_chain_js_1.wormAuditChain.addAuditEntry({
        eventType: 'security_violation',
        userId: 'user_123',
        action: 'unauthorized_access',
        resource: 'financial_records_v1',
        details: { ip: '192.168.1.1', attempt: 1 },
        classification: 'SECRET'
    });
    // 3. Verify Internal WORM Segment
    console.log('📦 Finalizing and exporting internal audit segment...');
    await worm_audit_chain_js_1.wormAuditChain.processPendingEntries();
    const currentSegmentId = worm_audit_chain_js_1.wormAuditChain.currentSegment.segmentId;
    const exportResult = await worm_audit_chain_js_1.wormAuditChain.exportSegment(currentSegmentId);
    if (exportResult) {
        console.log(`  ✅ Internal Segment ${exportResult.segment.segmentId} exported`);
        const isExportSignatureValid = await cryptographic_agility_1.fipsService.verify(JSON.stringify({ segment: exportResult.segment, verification: exportResult.verification }), exportResult.exportSignature, 'audit-export-signing-key');
        console.log(`  🛡️ Internal Export Signature: ${isExportSignatureValid ? 'VALID' : 'INVALID'}`);
    }
    // 4. Verify PROV-LEDGER Cross-Service Manifest
    console.log('\n🌐 Verifying Governance Ledger (prov-ledger) manifest...');
    try {
        const response = await (0, node_fetch_1.default)('http://localhost:4010/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: '{ getManifest(caseId: "ga-readiness-audit") { data } }'
            })
        });
        const { data } = await response.json();
        const manifestBase64 = data.getManifest.data;
        const manifestJson = JSON.parse(Buffer.from(manifestBase64, 'base64').toString());
        console.log(`  📜 Manifest issued at: ${manifestJson.issuedAt}`);
        // Verify HSM Signature on Manifest
        const manifestContent = JSON.stringify({
            caseId: manifestJson.caseId,
            version: manifestJson.version,
            issuedAt: manifestJson.issuedAt,
            claims: manifestJson.claims
        });
        const isProvSigValid = await cryptographic_agility_1.fipsService.verify(manifestContent, manifestJson.signature.sig, manifestJson.signature.kid);
        if (isProvSigValid) {
            console.log('  ✅ Prov-Ledger HSM signature is VALID (FIPS 140-2 compliant)');
        }
        else {
            console.log('  ❌ Prov-Ledger HSM signature is INVALID');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('  ❌ Failed to communicate with prov-ledger service:', error.message);
        process.exit(1);
    }
    console.log('\n🏆 END-TO-END AUDIT VERIFICATION SUCCESSFUL');
}
verifyAuditBundleEndToEnd().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
