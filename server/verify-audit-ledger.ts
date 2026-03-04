// @ts-nocheck
import { wormAuditChain } from './src/federal/worm-audit-chain.js';
import { fipsService } from './src/federal/fips-compliance.js';
import crypto from 'node:crypto';

async function verifyAuditBundleEndToEnd() {
  console.log('🔍 Starting End-to-End Audit Bundle Verification...');

  // 1. Initialize services
  await fipsService.initialize();

  // 2. Add some audit entries
  console.log('📝 Adding audit entries...');
  await wormAuditChain.addAuditEntry({
    eventType: 'security_violation',
    userId: 'user_123',
    action: 'unauthorized_access',
    resource: 'financial_records_v1',
    details: { ip: '192.168.1.1', attempt: 1 },
    classification: 'SECRET'
  });

  await wormAuditChain.addAuditEntry({
    eventType: 'crypto_key_rotation',
    userId: 'admin_sys',
    action: 'rotate',
    resource: 'kms_root_key',
    details: { keyId: 'key_009' },
    classification: 'TOP_SECRET'
  });

  // 3. Export the current segment
  // Since we just started, we need to finalize the segment first
  console.log('📦 Finalizing and exporting audit segment...');
  await (wormAuditChain as any).processPendingEntries();
  const currentSegmentId = (wormAuditChain as any).currentSegment.segmentId;

  const exportResult = await wormAuditChain.exportSegment(currentSegmentId);
  if (!exportResult) {
    throw new Error('Failed to export audit segment');
  }

  const { segment, verification, exportSignature } = exportResult;
  console.log(`✅ Segment ${segment.segmentId} exported with signature`);

  // 4. Verify the Export Signature (End-to-End HSM/FIPS verification)
  console.log('🛡️ Verifying export signature...');
  const exportData = JSON.stringify({
    segment,
    verification,
  });

  const isExportSignatureValid = await fipsService.verify(
    exportData,
    exportSignature,
    'audit-export-signing-key'
  );

  if (isExportSignatureValid) {
    console.log('  ✅ Export signature is VALID');
  } else {
    console.log('  ❌ Export signature is INVALID');
    process.exit(1);
  }

  // 5. Verify Hash Chain Integrity
  console.log('🔗 Verifying hash chain linkage...');
  if (verification.valid) {
    console.log(`  ✅ Hash chain is INTACT (${verification.totalEntries} entries)`);
  } else {
    console.log('  ❌ Hash chain is BROKEN');
    process.exit(1);
  }

  // 6. Verify Root Merkle Root Signature
  console.log('🌳 Verifying Merkle Root signature...');
  const isRootSignatureValid = await fipsService.verify(
    segment.rootHash,
    segment.rootSignature,
    'audit-root-signing-key'
  );

  if (isRootSignatureValid) {
    console.log('  ✅ Merkle Root signature is VALID');
  } else {
    console.log('  ❌ Merkle Root signature is INVALID');
    process.exit(1);
  }

  console.log('\n🏆 END-TO-END AUDIT VERIFICATION SUCCESSFUL');
}

verifyAuditBundleEndToEnd().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
