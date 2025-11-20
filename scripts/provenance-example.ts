#!/usr/bin/env ts-node
/**
 * Provenance Ledger Beta - Example Usage Script
 * Demonstrates complete end-to-end flow
 */

import { ProvenanceLedgerBetaService } from '../server/src/services/provenance-ledger-beta.js';
import { ingestDocument } from '../server/src/services/evidence-registration-flow.js';
import fs from 'fs/promises';
import path from 'path';

async function runExample() {
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│  Provenance Ledger Beta - Example Demonstration             │
│  Complete End-to-End Flow                                   │
└─────────────────────────────────────────────────────────────┘
`);

  const provenanceLedger = ProvenanceLedgerBetaService.getInstance();
  const userId = 'example-user-123';
  const investigationId = 'example-investigation-456';

  try {
    // ========================================================================
    // Step 1: Create a License
    // ========================================================================
    console.log(`📝 Step 1: Creating license...`);

    const license = await provenanceLedger.createLicense({
      license_type: 'internal',
      license_terms: 'Internal Use Only - Example',
      restrictions: ['no-external-sharing', 'training-purposes-only'],
      attribution_required: true,
    });

    console.log(`✅ License created: ${license.id}`);
    console.log(`   Type: ${license.license_type}`);
    console.log(`   Terms: ${license.license_terms}\n`);

    // ========================================================================
    // Step 2: Ingest a Document
    // ========================================================================
    console.log(`📄 Step 2: Ingesting sample document...`);

    const sampleDocument = `
Intelligence Report - Sample Analysis

Executive Summary:
The target organization, TechCorp Industries, has been operational since 2018.
Analysis indicates significant expansion plans for Q3 2025.
The company employs approximately 750 staff across multiple locations.

Financial Analysis:
Revenue projections show 35% growth year-over-year.
The organization has secured $50M in Series B funding.
Market analysts predict strong performance in the technology sector.

Operational Intelligence:
Primary operations are based in Silicon Valley, California.
The company maintains satellite offices in New York and Austin.
Recent hiring trends indicate focus on AI and machine learning talent.

Security Assessment:
Network infrastructure uses standard enterprise security protocols.
Physical security measures are rated as adequate for the threat level.
No significant vulnerabilities have been identified at this time.

Recommendations:
Continue monitoring expansion activities and hiring patterns.
Establish additional HUMINT sources within the target organization.
Review quarterly financial disclosures for strategic intelligence value.
`;

    const ingestionResult = await ingestDocument({
      documentPath: '/examples/sample-intel-report.txt',
      documentContent: sampleDocument,
      userId,
      investigationId,
      licenseId: license.id,
      metadata: {
        format: 'text',
        author: 'Example Analyst',
        classification: 'INTERNAL',
        source: 'OSINT',
      },
    });

    console.log(`✅ Document ingested successfully`);
    console.log(`   Source: ${ingestionResult.source.id}`);
    console.log(`   Transforms: ${ingestionResult.transforms.length}`);
    console.log(`   Evidence: ${ingestionResult.evidence.length}`);
    console.log(`   Claims extracted: ${ingestionResult.claims.length}`);
    console.log(`   Duration: ${ingestionResult.provenance_summary.total_duration_ms}ms\n`);

    // Display some claims
    console.log(`📋 Sample Claims Extracted:`);
    ingestionResult.claims.slice(0, 3).forEach((claim, i) => {
      console.log(`   ${i + 1}. "${claim.content.substring(0, 60)}..."`);
      console.log(`      Type: ${claim.claim_type}, Confidence: ${claim.confidence}`);
    });
    console.log(``);

    // ========================================================================
    // Step 3: Query Claims
    // ========================================================================
    console.log(`🔍 Step 3: Querying claims...`);

    const claims = await provenanceLedger.queryClaims({
      investigation_id: investigationId,
      confidence_min: 0.8,
    });

    console.log(`✅ Found ${claims.length} claims with confidence >= 0.8\n`);

    // ========================================================================
    // Step 4: Get Provenance Chain
    // ========================================================================
    console.log(`🔗 Step 4: Retrieving provenance chain for first claim...`);

    const firstClaim = claims[0];
    const provenanceChain = await provenanceLedger.getProvenanceChain(
      firstClaim.id,
    );

    console.log(`✅ Provenance chain retrieved`);
    console.log(`   Item: ${provenanceChain.item_id}`);
    console.log(`   Source: ${provenanceChain.source?.source_hash.substring(0, 16)}...`);
    console.log(`   Transforms: ${provenanceChain.transforms.length}`);
    console.log(`   Evidence: ${provenanceChain.evidence?.length || 0}`);
    console.log(`   Licenses: ${provenanceChain.licenses.length}`);
    console.log(`   Custody Chain: ${provenanceChain.custody_chain.join(' → ')}\n`);

    // Display transform chain
    console.log(`   Transform Chain:`);
    provenanceChain.transforms.forEach((t, i) => {
      console.log(
        `      ${i + 1}. ${t.transform_type} (${t.algorithm} v${t.version})`,
      );
      console.log(
        `         Input:  ${t.input_hash.substring(0, 16)}...`,
      );
      console.log(
        `         Output: ${t.output_hash.substring(0, 16)}...`,
      );
    });
    console.log(``);

    // ========================================================================
    // Step 5: Create Export Manifest
    // ========================================================================
    console.log(`📦 Step 5: Creating export manifest...`);

    const manifest = await provenanceLedger.createExportManifest({
      investigation_id: investigationId,
      export_type: 'investigation_evidence_package',
      classification_level: 'INTERNAL',
      created_by: userId,
      authority_basis: ['example-warrant-789', 'example-authorization-012'],
    });

    console.log(`✅ Export manifest created`);
    console.log(`   Manifest ID: ${manifest.manifest_id}`);
    console.log(`   Bundle ID: ${manifest.bundle_id}`);
    console.log(`   Merkle Root: ${manifest.merkle_root.substring(0, 32)}...`);
    console.log(`   Items: ${manifest.items.length}`);
    console.log(`   Licenses: ${manifest.licenses.length}`);
    console.log(`   Signature: ${manifest.signature.substring(0, 32)}...\n`);

    // ========================================================================
    // Step 6: Verify Manifest
    // ========================================================================
    console.log(`🔍 Step 6: Verifying export manifest...`);

    const verification = await provenanceLedger.verifyManifest(
      manifest.manifest_id,
    );

    console.log(`✅ Verification complete`);
    console.log(`   Bundle Valid: ${verification.bundle_valid ? '✅ YES' : '❌ NO'}`);
    console.log(`   Signature Valid: ${verification.signature_valid ? '✅' : '❌'}`);
    console.log(`   Merkle Valid: ${verification.merkle_valid ? '✅' : '❌'}`);
    console.log(
      `   Items Verified: ${verification.item_verifications.filter((v) => v.valid).length}/${verification.item_verifications.length}`,
    );
    console.log(`   License Issues: ${verification.license_issues.length}\n`);

    // ========================================================================
    // Step 7: Export Bundle to File
    // ========================================================================
    console.log(`💾 Step 7: Exporting bundle to file...`);

    const bundleData = {
      manifest,
      claims: ingestionResult.claims,
      evidence: ingestionResult.evidence,
      sources: [ingestionResult.source],
      transforms: ingestionResult.transforms,
      verification,
    };

    const outputDir = path.join(process.cwd(), 'examples', 'exports');
    await fs.mkdir(outputDir, { recursive: true });

    const bundlePath = path.join(
      outputDir,
      `bundle-${manifest.bundle_id}.json`,
    );
    await fs.writeFile(bundlePath, JSON.stringify(bundleData, null, 2));

    console.log(`✅ Bundle exported to: ${bundlePath}`);
    console.log(`   Size: ${(JSON.stringify(bundleData).length / 1024).toFixed(2)} KB\n`);

    // ========================================================================
    // Summary
    // ========================================================================
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│  DEMONSTRATION COMPLETE                                     │
└─────────────────────────────────────────────────────────────┘

✅ Successfully demonstrated:
   1. License creation
   2. Document ingestion with automatic claim extraction
   3. Transform chain tracking
   4. Provenance chain retrieval
   5. Export manifest creation with Merkle trees
   6. Manifest verification with digital signatures
   7. Bundle export to file

📁 Output Files:
   ${bundlePath}

🔐 Key Features Demonstrated:
   ✓ SHA-256 content hashing
   ✓ Complete source → transform → claim chain
   ✓ License tracking and inheritance
   ✓ Merkle tree integrity verification
   ✓ Digital signatures (HMAC-SHA256)
   ✓ Offline verification capability

🚀 Next Steps:
   1. Verify the bundle offline:
      ts-node scripts/verify-provenance-bundle.ts ${bundlePath}

   2. Query via GraphQL:
      query {
        claim(id: "${firstClaim.id}", includeProvenance: true) {
          content
          confidence
          provenance { transforms { algorithm } }
        }
      }

   3. Integrate into your application:
      See docs/provenance-ledger-beta-implementation.md

Thank you for trying the Provenance Ledger Beta! 🎉
`);
  } catch (error) {
    console.error(`\n❌ Error during demonstration:`, error);
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runExample };
