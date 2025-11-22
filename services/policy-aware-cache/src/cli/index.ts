#!/usr/bin/env node
/**
 * Policy-Aware Cache CLI
 *
 * Commands:
 * - cache explain <key>     Show detailed breakdown of cache key
 * - cache stats             Show cache statistics
 * - cache clear             Clear all cache entries
 * - cache invalidate <pattern> Invalidate entries matching pattern
 */

import { Command } from 'commander';
import { PolicyAwareCacheService } from '../lib/PolicyAwareCacheService.js';
import type { InvalidationEvent } from '../types/index.js';

const program = new Command();

program
  .name('cache')
  .description('Policy-Aware Cache CLI')
  .version('1.0.0');

// Initialize cache service
const cacheService = new PolicyAwareCacheService();

// ============================================================================
// Explain Command
// ============================================================================

program
  .command('explain')
  .description('Show detailed breakdown of cache key')
  .argument('<key>', 'Cache key to explain')
  .option('-j, --json', 'Output as JSON')
  .action(async (key: string, options: { json?: boolean }) => {
    try {
      const explain = await cacheService.explain(key);

      if (options.json) {
        console.log(JSON.stringify(explain, null, 2));
      } else {
        printExplain(explain);
      }

      await cacheService.close();
      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      await cacheService.close();
      process.exit(1);
    }
  });

// ============================================================================
// Stats Command
// ============================================================================

program
  .command('stats')
  .description('Show cache statistics')
  .option('-j, --json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      const stats = await cacheService.getStats();

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        printStats(stats);
      }

      await cacheService.close();
      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      await cacheService.close();
      process.exit(1);
    }
  });

// ============================================================================
// Clear Command
// ============================================================================

program
  .command('clear')
  .description('Clear all cache entries')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options: { force?: boolean }) => {
    try {
      if (!options.force) {
        console.log('This will clear ALL cache entries. Use --force to confirm.');
        await cacheService.close();
        process.exit(1);
      }

      const count = await cacheService.clear();
      console.log(`✅ Cleared ${count} cache entries`);

      await cacheService.close();
      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      await cacheService.close();
      process.exit(1);
    }
  });

// ============================================================================
// Invalidate Command
// ============================================================================

program
  .command('invalidate')
  .description('Invalidate cache entries matching pattern')
  .argument('<pattern>', 'Key pattern (supports wildcards)')
  .option('-r, --reason <reason>', 'Reason for invalidation', 'Manual invalidation')
  .option('-u, --user <user>', 'User initiating invalidation', 'cli-user')
  .action(
    async (
      pattern: string,
      options: { reason?: string; user?: string },
    ) => {
      try {
        const event: InvalidationEvent = {
          type: 'manual',
          timestamp: new Date().toISOString(),
          reason: options.reason || 'Manual invalidation',
          keyPatterns: [pattern],
          initiatedBy: options.user || 'cli-user',
        };

        const count = await cacheService.invalidate(event);
        console.log(`✅ Invalidated ${count} cache entries matching: ${pattern}`);

        await cacheService.close();
        process.exit(0);
      } catch (error: any) {
        console.error('Error:', error.message);
        await cacheService.close();
        process.exit(1);
      }
    },
  );

// ============================================================================
// Verify Command
// ============================================================================

program
  .command('verify')
  .description('Verify proof signature for a cache key')
  .argument('<key>', 'Cache key to verify')
  .action(async (key: string) => {
    try {
      const explain = await cacheService.explain(key);

      if (!explain.exists) {
        console.log('❌ Cache key does not exist');
        await cacheService.close();
        process.exit(1);
      }

      if (!explain.proof) {
        console.log('❌ No proof available');
        await cacheService.close();
        process.exit(1);
      }

      const isValid = cacheService.verifyProof(explain.proof);

      if (isValid) {
        console.log('✅ Proof signature is valid');
        console.log('\nProof Details:');
        console.log(`  Query Hash:    ${explain.proof.queryHash}`);
        console.log(`  Policy:        ${explain.proof.policyVersion} (${explain.proof.policyDigest.substring(0, 12)}...)`);
        console.log(`  User:          ${explain.proof.userSnapshot.userId}`);
        console.log(`  Data Snapshot: ${explain.proof.dataSnapshot.snapshotId}`);
        console.log(`  Cached At:     ${explain.proof.cachedAt}`);
        console.log(`  TTL:           ${explain.proof.ttl}s`);
      } else {
        console.log('❌ Proof signature is INVALID - cache may be tampered!');
        await cacheService.close();
        process.exit(1);
      }

      await cacheService.close();
      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      await cacheService.close();
      process.exit(1);
    }
  });

// ============================================================================
// Helper Functions
// ============================================================================

function printExplain(explain: any): void {
  console.log('\n📊 Cache Key Explanation\n');
  console.log(`Key:       ${explain.key}`);
  console.log(`Exists:    ${explain.exists ? '✅ Yes' : '❌ No'}\n`);

  if (explain.exists && explain.dataMetadata) {
    console.log('📦 Cached Data:');
    console.log(`  Type:       ${explain.dataMetadata.type}`);
    console.log(`  Size:       ${formatBytes(explain.dataMetadata.size)}`);
    console.log(`  Cached At:  ${explain.dataMetadata.cachedAt}`);
    console.log(`  Expires At: ${explain.dataMetadata.expiresAt}`);
    console.log(`  TTL:        ${explain.dataMetadata.ttl}s\n`);
  }

  if (explain.proof) {
    console.log('🔐 Proof Bundle:');
    console.log(`  Query Hash:       ${explain.proof.queryHash}`);
    console.log(`  Params Hash:      ${explain.proof.paramsHash}`);
    console.log(`  Policy Version:   ${explain.proof.policyVersion}`);
    console.log(`  Policy Digest:    ${explain.proof.policyDigest.substring(0, 16)}...`);
    console.log(`  User ID:          ${explain.proof.userSnapshot.userId}`);
    console.log(`  Roles Hash:       ${explain.proof.userSnapshot.rolesHash.substring(0, 16)}...`);
    console.log(`  Data Snapshot:    ${explain.proof.dataSnapshot.snapshotId}`);
    console.log(`  Signature:        ${explain.proof.signature.substring(0, 16)}...\n`);

    if (explain.proof.provenance) {
      console.log('📜 Provenance:');
      console.log(`  Computed By:      ${explain.proof.provenance.computedBy}`);
      console.log(`  Computed At:      ${explain.proof.provenance.computedAt}`);
      console.log(`  Input Sources:    ${explain.proof.provenance.inputSources.join(', ')}\n`);
    }
  }

  if (explain.invalidationHistory && explain.invalidationHistory.length > 0) {
    console.log('📋 Invalidation History:');
    for (const event of explain.invalidationHistory) {
      console.log(`  [${event.timestamp}] ${event.type}: ${event.reason}`);
      console.log(`    Initiated by: ${event.initiatedBy}`);
    }
    console.log();
  }
}

function printStats(stats: any): void {
  console.log('\n📈 Cache Statistics\n');
  console.log(`Total Entries:  ${stats.totalEntries}`);
  console.log(`Hit Rate:       ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`Miss Rate:      ${(stats.missRate * 100).toFixed(2)}%`);
  console.log(`Avg TTL:        ${stats.avgTTL}s\n`);

  if (stats.memoryUsage) {
    console.log(`Memory Usage:   ${formatBytes(stats.memoryUsage)}\n`);
  }

  if (Object.keys(stats.byPolicyVersion).length > 0) {
    console.log('📋 By Policy Version:');
    for (const [version, count] of Object.entries(stats.byPolicyVersion)) {
      console.log(`  ${version}: ${count}`);
    }
    console.log();
  }

  if (Object.keys(stats.byUser).length > 0) {
    console.log('👤 By User (anonymized):');
    const topUsers = Object.entries(stats.byUser)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);

    for (const [userHash, count] of topUsers) {
      console.log(`  ${(userHash as string).substring(0, 12)}...: ${count}`);
    }
    console.log();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Parse and execute
program.parse();
