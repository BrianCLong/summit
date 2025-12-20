#!/usr/bin/env node
import { Command } from 'commander';
import axios from 'axios';
import { createHash } from 'crypto';
import pino from 'pino';
import CryptoJS from 'crypto-js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

const program = new Command();

program
  .name('verifier')
  .description('Provenance verification CLI with tamper detection')
  .version('1.0.0');

/**
 * Verify claim hash
 */
program
  .command('verify-claim')
  .description('Verify a claim hash integrity')
  .requiredOption('--claim-id <id>', 'Claim ID to verify')
  .option('--base-url <url>', 'Prov-ledger base URL', 'http://localhost:4010')
  .option('--authority-id <id>', 'Authority ID for access')
  .option('--reason <reason>', 'Reason for access')
  .action(async (options) => {
    try {
      const client = axios.create({
        baseURL: options.baseUrl,
        headers: {
          ...(options.authorityId && { 'X-Authority-Id': options.authorityId }),
          ...(options.reason && { 'X-Reason-For-Access': options.reason }),
        },
      });

      logger.info({ claimId: options.claimId }, 'Fetching claim');

      const claimResponse = await client.get(`/claims/${options.claimId}`);
      const claim = claimResponse.data;

      // Recompute hash
      const computedHash = createHash('sha256')
        .update(JSON.stringify(claim.content, Object.keys(claim.content).sort()))
        .digest('hex');

      const isValid = computedHash === claim.hash;

      if (isValid) {
        console.log('\n✅ Claim integrity verified');
        console.log(`   Claim ID: ${claim.id}`);
        console.log(`   Hash: ${claim.hash}`);
        console.log(`   Created: ${claim.created_at}`);
      } else {
        console.log('\n❌ TAMPER DETECTED!');
        console.log(`   Claim ID: ${claim.id}`);
        console.log(`   Expected hash: ${claim.hash}`);
        console.log(`   Computed hash: ${computedHash}`);
        process.exit(1);
      }
    } catch (error: any) {
      logger.error({ error }, 'Verification failed');
      console.error('\n❌ Verification failed:', error.message);
      process.exit(1);
    }
  });

/**
 * Verify Merkle tree
 */
program
  .command('verify-merkle')
  .description('Verify Merkle tree integrity for a case')
  .requiredOption('--case-id <id>', 'Case ID to verify')
  .option('--base-url <url>', 'Prov-ledger base URL', 'http://localhost:4010')
  .option('--authority-id <id>', 'Authority ID for access')
  .option('--reason <reason>', 'Reason for access')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const client = axios.create({
        baseURL: options.baseUrl,
        headers: {
          ...(options.authorityId && { 'X-Authority-Id': options.authorityId }),
          ...(options.reason && { 'X-Reason-For-Access': options.reason }),
        },
      });

      logger.info({ caseId: options.caseId }, 'Fetching disclosure bundle');

      const bundleResponse = await client.get(`/bundles/${options.caseId}`);
      const bundle = bundleResponse.data;

      // Compute Merkle root
      const computedRoot = computeMerkleRoot(bundle.hashTree);

      const isValid = computedRoot === bundle.merkleRoot;
      const tamperedNodes = isValid ? [] : findTamperedNodes(bundle.hashTree, bundle.merkleRoot);

      if (isValid) {
        console.log('\n✅ Merkle tree verified');
        console.log(`   Case ID: ${bundle.caseId}`);
        console.log(`   Evidence count: ${bundle.evidence.length}`);
        console.log(`   Merkle root: ${bundle.merkleRoot}`);
        console.log(`   Generated: ${bundle.generated_at}`);

        if (options.verbose) {
          console.log('\n   Evidence:');
          bundle.evidence.forEach((ev: any, i: number) => {
            console.log(`   ${i + 1}. ${ev.sourceRef}`);
            console.log(`      ID: ${ev.id}`);
            console.log(`      Hash: ${ev.checksum}`);
          });
        }
      } else {
        console.log('\n❌ MERKLE TREE TAMPERED!');
        console.log(`   Case ID: ${bundle.caseId}`);
        console.log(`   Expected root: ${bundle.merkleRoot}`);
        console.log(`   Computed root: ${computedRoot}`);
        console.log(`   Tampered nodes: ${tamperedNodes.length}`);

        if (options.verbose && tamperedNodes.length > 0) {
          console.log('\n   Tampered nodes:');
          tamperedNodes.forEach((node, i) => {
            console.log(`   ${i + 1}. ${node}`);
          });
        }

        process.exit(1);
      }
    } catch (error: any) {
      logger.error({ error }, 'Verification failed');
      console.error('\n❌ Verification failed:', error.message);
      process.exit(1);
    }
  });

/**
 * Verify evidence chain
 */
program
  .command('verify-evidence')
  .description('Verify evidence and transformation chain')
  .requiredOption('--evidence-id <id>', 'Evidence ID to verify')
  .option('--base-url <url>', 'Prov-ledger base URL', 'http://localhost:4010')
  .option('--authority-id <id>', 'Authority ID for access')
  .option('--reason <reason>', 'Reason for access')
  .action(async (options) => {
    try {
      const client = axios.create({
        baseURL: options.baseUrl,
        headers: {
          ...(options.authorityId && { 'X-Authority-Id': options.authorityId }),
          ...(options.reason && { 'X-Reason-For-Access': options.reason }),
        },
      });

      logger.info({ evidenceId: options.evidenceId }, 'Fetching evidence');

      const evidenceResponse = await client.get(`/evidence/${options.evidenceId}`);
      const evidence = evidenceResponse.data;

      console.log('\n✅ Evidence retrieved');
      console.log(`   Evidence ID: ${evidence.id}`);
      console.log(`   Source: ${evidence.sourceRef}`);
      console.log(`   Checksum: ${evidence.checksum}`);
      console.log(`   Algorithm: ${evidence.checksumAlgorithm}`);
      console.log(`   Created: ${evidence.created_at}`);

      if (evidence.authorityId) {
        console.log(`   Authority: ${evidence.authorityId}`);
      }

      if (evidence.transformChain && evidence.transformChain.length > 0) {
        console.log('\n   Transformation chain:');
        evidence.transformChain.forEach((transform: any, i: number) => {
          console.log(`   ${i + 1}. ${transform.transformType}`);
          console.log(`      Actor: ${transform.actorId}`);
          console.log(`      Timestamp: ${transform.timestamp}`);
        });
      }

      if (evidence.policyLabels && evidence.policyLabels.length > 0) {
        console.log('\n   Policy labels:');
        evidence.policyLabels.forEach((label: string) => {
          console.log(`   • ${label}`);
        });
      }
    } catch (error: any) {
      logger.error({ error }, 'Verification failed');
      console.error('\n❌ Verification failed:', error.message);
      process.exit(1);
    }
  });

/**
 * Batch verify all claims
 */
program
  .command('verify-all')
  .description('Verify all claims and generate report')
  .option('--base-url <url>', 'Prov-ledger base URL', 'http://localhost:4010')
  .option('--authority-id <id>', 'Authority ID for access')
  .option('--reason <reason>', 'Reason for access')
  .option('--output <file>', 'Output report file (JSON)')
  .action(async (options) => {
    try {
      const client = axios.create({
        baseURL: options.baseUrl,
        headers: {
          ...(options.authorityId && { 'X-Authority-Id': options.authorityId }),
          ...(options.reason && { 'X-Reason-For-Access': options.reason }),
        },
      });

      logger.info('Fetching manifest');

      const manifestResponse = await client.get('/export/manifest');
      const manifest = manifestResponse.data;

      console.log('\n🔍 Verifying all claims...\n');

      let verified = 0;
      let tampered = 0;
      const tamperedClaims: any[] = [];

      for (const claim of manifest.claims) {
        try {
          const claimResponse = await client.get(`/claims/${claim.id}`);
          const fullClaim = claimResponse.data;

          const computedHash = createHash('sha256')
            .update(JSON.stringify(fullClaim.content, Object.keys(fullClaim.content).sort()))
            .digest('hex');

          if (computedHash === fullClaim.hash) {
            verified++;
            process.stdout.write('✓');
          } else {
            tampered++;
            tamperedClaims.push({
              id: claim.id,
              expectedHash: fullClaim.hash,
              computedHash,
            });
            process.stdout.write('✗');
          }
        } catch (error) {
          logger.error({ error, claimId: claim.id }, 'Failed to verify claim');
          process.stdout.write('?');
        }
      }

      console.log('\n');
      console.log(`\n📊 Verification Summary:`);
      console.log(`   Total claims: ${manifest.claims.length}`);
      console.log(`   Verified: ${verified} ✅`);
      console.log(`   Tampered: ${tampered} ❌`);

      if (tamperedClaims.length > 0) {
        console.log('\n   Tampered claims:');
        tamperedClaims.forEach((claim) => {
          console.log(`   • ${claim.id}`);
          console.log(`     Expected: ${claim.expectedHash}`);
          console.log(`     Computed: ${claim.computedHash}`);
        });
      }

      if (options.output) {
        const report = {
          timestamp: new Date().toISOString(),
          total: manifest.claims.length,
          verified,
          tampered,
          tamperedClaims,
        };

        const fs = await import('fs/promises');
        await fs.writeFile(options.output, JSON.stringify(report, null, 2));
        console.log(`\n📄 Report saved to ${options.output}`);
      }

      if (tampered > 0) {
        process.exit(1);
      }
    } catch (error: any) {
      logger.error({ error }, 'Batch verification failed');
      console.error('\n❌ Batch verification failed:', error.message);
      process.exit(1);
    }
  });

/**
 * Compute Merkle root
 */
function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  const newLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    if (i + 1 < hashes.length) {
      const combined = hashes[i] + hashes[i + 1];
      newLevel.push(CryptoJS.SHA256(combined).toString());
    } else {
      newLevel.push(hashes[i]);
    }
  }

  return computeMerkleRoot(newLevel);
}

/**
 * Find tampered nodes (simplified)
 */
function findTamperedNodes(hashes: string[], expectedRoot: string): string[] {
  const tamperedNodes: string[] = [];
  const computedRoot = computeMerkleRoot(hashes);

  if (computedRoot !== expectedRoot) {
    tamperedNodes.push(expectedRoot);
  }

  return tamperedNodes;
}

program.parse();
