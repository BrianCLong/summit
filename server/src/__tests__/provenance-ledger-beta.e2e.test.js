"use strict";
/**
 * Provenance Ledger Beta - End-to-End Test
 * Tests complete flow: ingest → claim registration → export → verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const provenance_ledger_beta_js_1 = require("../services/provenance-ledger-beta.js");
const evidence_registration_flow_js_1 = require("../services/evidence-registration-flow.js");
const merkle_tree_js_1 = require("../utils/merkle-tree.js");
const runAcceptance = process.env.RUN_ACCEPTANCE === 'true';
const describeIf = runAcceptance ? globals_1.describe : globals_1.describe.skip;
describeIf('Provenance Ledger Beta - End-to-End', () => {
    let provenanceLedger;
    let testLicense;
    let userId;
    let investigationId;
    (0, globals_1.beforeAll)(async () => {
        provenanceLedger = provenance_ledger_beta_js_1.ProvenanceLedgerBetaService.getInstance();
        userId = 'test-user-123';
        investigationId = 'test-investigation-456';
        // Create test license
        testLicense = await provenanceLedger.createLicense({
            license_type: 'internal',
            license_terms: 'Internal Use Only',
            restrictions: ['no-external-sharing'],
            attribution_required: true,
        });
        (0, globals_1.expect)(testLicense).toBeDefined();
        (0, globals_1.expect)(testLicense.id).toBeTruthy();
    });
    (0, globals_1.it)('should complete full provenance flow from document ingestion to verified export', async () => {
        // ========================================================================
        // STEP 1: INGEST DOCUMENT
        // ========================================================================
        const documentContent = `
      Intelligence Report - Sample Document

      The target organization has been operating in the region since 2020.
      Analysis indicates a 75% probability of expansion within 6 months.
      The primary contact is John Smith, based in New York.
      Financial records show revenue growth of 20% year-over-year.
      Security assessment reveals moderate risk level.
      Satellite imagery confirms presence at the reported location.
      The organization claims to have 500+ employees globally.
      Communications are encrypted using standard protocols.
    `;
        console.log('📄 Ingesting document...');
        const ingestionResult = await (0, evidence_registration_flow_js_1.ingestDocument)({
            documentPath: '/test/sample-report.txt',
            documentContent,
            userId,
            investigationId,
            licenseId: testLicense.id,
            metadata: {
                format: 'text',
                author: 'Test Analyst',
                size_bytes: documentContent.length,
            },
        });
        // Verify ingestion results
        (0, globals_1.expect)(ingestionResult.source).toBeDefined();
        (0, globals_1.expect)(ingestionResult.transforms.length).toBeGreaterThan(0);
        (0, globals_1.expect)(ingestionResult.evidence.length).toBeGreaterThan(0);
        (0, globals_1.expect)(ingestionResult.claims.length).toBeGreaterThan(0);
        console.log(`✅ Document ingested successfully`);
        console.log(`   - Source: ${ingestionResult.source.id}`);
        console.log(`   - Transforms: ${ingestionResult.transforms.length}`);
        console.log(`   - Evidence: ${ingestionResult.evidence.length}`);
        console.log(`   - Claims: ${ingestionResult.claims.length}`);
        const { source, transforms, evidence, claims } = ingestionResult;
        // ========================================================================
        // STEP 2: VERIFY TRANSFORM CHAINS
        // ========================================================================
        console.log('\n🔗 Verifying transform chains...');
        for (const claim of claims) {
            (0, globals_1.expect)(claim.transform_chain.length).toBeGreaterThan(0);
            // Verify each transform exists
            const claimTransforms = await provenanceLedger['getTransformChain'](claim.transform_chain);
            (0, globals_1.expect)(claimTransforms.length).toBe(claim.transform_chain.length);
            // Verify chain integrity (output → input linking)
            for (let i = 0; i < claimTransforms.length - 1; i++) {
                const current = claimTransforms[i];
                const next = claimTransforms[i + 1];
                // Next transform's input should match current's output
                if (next.parent_transforms.includes(current.id)) {
                    (0, globals_1.expect)(next.input_hash).toBe(current.output_hash);
                }
            }
            console.log(`   ✓ Claim ${claim.id}: ${claim.transform_chain.length} transforms verified`);
        }
        // ========================================================================
        // STEP 3: VERIFY PROVENANCE CHAINS
        // ========================================================================
        console.log('\n📜 Retrieving provenance chains...');
        for (const claim of claims) {
            const provenanceChain = await provenanceLedger.getProvenanceChain(claim.id);
            (0, globals_1.expect)(provenanceChain).toBeDefined();
            (0, globals_1.expect)(provenanceChain.item_id).toBe(claim.id);
            (0, globals_1.expect)(provenanceChain.item_type).toBe('claim');
            (0, globals_1.expect)(provenanceChain.source).toBeDefined();
            (0, globals_1.expect)(provenanceChain.transforms.length).toBeGreaterThan(0);
            (0, globals_1.expect)(provenanceChain.evidence.length).toBeGreaterThan(0);
            (0, globals_1.expect)(provenanceChain.licenses.length).toBeGreaterThan(0);
            console.log(`   ✓ Claim ${claim.id.substring(0, 12)}...: complete provenance chain`);
        }
        // ========================================================================
        // STEP 4: CREATE EXPORT MANIFEST
        // ========================================================================
        console.log('\n📦 Creating export manifest...');
        const manifest = await provenanceLedger.createExportManifest({
            investigation_id: investigationId,
            export_type: 'investigation_bundle',
            classification_level: 'INTERNAL',
            created_by: userId,
            authority_basis: ['investigation-warrant-123'],
        });
        (0, globals_1.expect)(manifest).toBeDefined();
        (0, globals_1.expect)(manifest.manifest_id).toBeTruthy();
        (0, globals_1.expect)(manifest.merkle_root).toBeTruthy();
        (0, globals_1.expect)(manifest.items.length).toBeGreaterThan(0);
        (0, globals_1.expect)(manifest.signature).toBeTruthy();
        console.log(`✅ Export manifest created`);
        console.log(`   - Manifest ID: ${manifest.manifest_id}`);
        console.log(`   - Merkle Root: ${manifest.merkle_root.substring(0, 16)}...`);
        console.log(`   - Items: ${manifest.items.length}`);
        console.log(`   - Signature: ${manifest.signature.substring(0, 16)}...`);
        // ========================================================================
        // STEP 5: VERIFY MERKLE PROOFS
        // ========================================================================
        console.log('\n🌲 Verifying Merkle proofs...');
        let validProofs = 0;
        for (const item of manifest.items) {
            const proofValid = merkle_tree_js_1.MerkleTreeBuilder.verifyProof(item.content_hash, item.merkle_proof, manifest.merkle_root);
            (0, globals_1.expect)(proofValid).toBe(true);
            if (proofValid) {
                validProofs++;
            }
        }
        console.log(`   ✅ All ${validProofs}/${manifest.items.length} Merkle proofs valid`);
        // ========================================================================
        // STEP 6: VERIFY EXPORT MANIFEST
        // ========================================================================
        console.log('\n🔍 Verifying export manifest...');
        const verificationReport = await provenanceLedger.verifyManifest(manifest.manifest_id);
        (0, globals_1.expect)(verificationReport).toBeDefined();
        (0, globals_1.expect)(verificationReport.bundle_valid).toBe(true);
        (0, globals_1.expect)(verificationReport.signature_valid).toBe(true);
        (0, globals_1.expect)(verificationReport.merkle_valid).toBe(true);
        (0, globals_1.expect)(verificationReport.item_verifications.every((v) => v.valid)).toBe(true);
        console.log(`✅ Manifest verification complete`);
        console.log(`   - Bundle Valid: ${verificationReport.bundle_valid}`);
        console.log(`   - Signature Valid: ${verificationReport.signature_valid}`);
        console.log(`   - Merkle Valid: ${verificationReport.merkle_valid}`);
        console.log(`   - Items Valid: ${verificationReport.item_verifications.filter((v) => v.valid).length}/${verificationReport.item_verifications.length}`);
        // ========================================================================
        // STEP 7: VERIFY LICENSES
        // ========================================================================
        console.log('\n📜 Verifying licenses...');
        (0, globals_1.expect)(manifest.licenses.length).toBeGreaterThan(0);
        (0, globals_1.expect)(manifest.licenses[0].id).toBe(testLicense.id);
        (0, globals_1.expect)(verificationReport.license_issues.length).toBe(0);
        console.log(`   ✅ ${manifest.licenses.length} license(s) present, no conflicts`);
        // ========================================================================
        // FINAL SUMMARY
        // ========================================================================
        console.log('\n' + '='.repeat(60));
        console.log('🎉 END-TO-END TEST COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log(`\n📊 Summary:`);
        console.log(`   - Document ingested: ✅`);
        console.log(`   - Sources registered: ${1}`);
        console.log(`   - Transforms applied: ${transforms.length}`);
        console.log(`   - Evidence registered: ${evidence.length}`);
        console.log(`   - Claims extracted: ${claims.length}`);
        console.log(`   - Transform chains verified: ✅`);
        console.log(`   - Provenance chains complete: ✅`);
        console.log(`   - Export manifest created: ✅`);
        console.log(`   - Merkle proofs valid: ✅`);
        console.log(`   - Signature valid: ✅`);
        console.log(`   - Offline verification ready: ✅`);
        console.log(`\n💡 All assertions carry:`);
        console.log(`   ✓ Source → Transform chain`);
        console.log(`   ✓ Content hashes`);
        console.log(`   ✓ Confidence scores`);
        console.log(`   ✓ License information`);
        console.log(`\n📦 Export ships with:`);
        console.log(`   ✓ Verifiable Merkle manifest`);
        console.log(`   ✓ Digital signatures`);
        console.log(`   ✓ Chain of custody`);
        console.log(`   ✓ Complete provenance`);
        console.log('\n✨ Wishbooks requirement fulfilled!\n');
    }, 30000); // 30 second timeout for long test
    (0, globals_1.it)('should handle claim contradictions and corroborations', async () => {
        // Create two contradicting claims
        const claim1 = await provenanceLedger.registerClaim({
            content: 'The organization has 500 employees',
            claim_type: 'factual',
            confidence: 0.8,
            evidence_ids: [],
            source_id: 'test-source-1',
            transform_chain: [],
            created_by: userId,
            license_id: testLicense.id,
        });
        const claim2 = await provenanceLedger.registerClaim({
            content: 'The organization has 1000 employees',
            claim_type: 'factual',
            confidence: 0.7,
            evidence_ids: [],
            source_id: 'test-source-2',
            transform_chain: [],
            created_by: userId,
            license_id: testLicense.id,
            contradicts: [claim1.id],
        });
        (0, globals_1.expect)(claim1).toBeDefined();
        (0, globals_1.expect)(claim2).toBeDefined();
        (0, globals_1.expect)(claim2.contradicts).toContain(claim1.id);
        console.log('✅ Contradiction tracking working');
    });
    (0, globals_1.it)('should track license requirements across chains', async () => {
        // Create a restricted license
        const restrictedLicense = await provenanceLedger.createLicense({
            license_type: 'restricted',
            license_terms: 'Authorized Personnel Only',
            restrictions: ['clearance-required', 'no-export'],
            attribution_required: true,
        });
        // Create source with restricted license
        const source = await provenanceLedger.registerSource({
            source_hash: 'test-hash-restricted',
            source_type: 'database',
            created_by: userId,
            license_id: restrictedLicense.id,
        });
        (0, globals_1.expect)(source.license_id).toBe(restrictedLicense.id);
        const license = await provenanceLedger.getLicense(restrictedLicense.id);
        (0, globals_1.expect)(license.restrictions).toContain('clearance-required');
        (0, globals_1.expect)(license.restrictions).toContain('no-export');
        console.log('✅ License restriction tracking working');
    });
});
(0, globals_1.describe)('Merkle Tree Utilities', () => {
    (0, globals_1.it)('should build and verify Merkle tree correctly', () => {
        const items = [
            { id: '1', content_hash: 'hash1', data: 'item1' },
            { id: '2', content_hash: 'hash2', data: 'item2' },
            { id: '3', content_hash: 'hash3', data: 'item3' },
            { id: '4', content_hash: 'hash4', data: 'item4' },
        ];
        const tree = merkle_tree_js_1.MerkleTreeBuilder.buildFromItems(items);
        (0, globals_1.expect)(tree.root).toBeTruthy();
        (0, globals_1.expect)(tree.leaves.length).toBe(4);
        // Verify each item
        for (const item of items) {
            const proof = merkle_tree_js_1.MerkleTreeBuilder.generateProof(item.content_hash, items);
            const valid = merkle_tree_js_1.MerkleTreeBuilder.verifyProofObject(proof);
            (0, globals_1.expect)(valid).toBe(true);
        }
        console.log('✅ Merkle tree construction and verification working');
    });
    (0, globals_1.it)('should detect tampered items', () => {
        const items = [
            { id: '1', content_hash: 'hash1' },
            { id: '2', content_hash: 'hash2' },
        ];
        const tree = merkle_tree_js_1.MerkleTreeBuilder.buildFromItems(items);
        const proof = merkle_tree_js_1.MerkleTreeBuilder.generateProof('hash1', items);
        // Tamper with the proof
        proof.leaf_hash = 'tampered_hash';
        const valid = merkle_tree_js_1.MerkleTreeBuilder.verifyProofObject(proof);
        (0, globals_1.expect)(valid).toBe(false);
        console.log('✅ Merkle tree tamper detection working');
    });
});
