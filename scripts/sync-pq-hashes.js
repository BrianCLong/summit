#!/usr/bin/env node

/**
 * Automated Persisted Query Hash Sync Script
 *
 * This script syncs persisted query hashes from CI artifacts to Redis,
 * preventing client deployment issues caused by hash drift.
 *
 * Usage:
 *   node scripts/sync-pq-hashes.js --source=artifacts --env=production
 *   node scripts/sync-pq-hashes.js --source=file --file=./pq-hashes.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('redis');

// Configuration
const config = {
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'pq:',
    allowlistKey: 'pq:allowlist',
    metadataKey: 'pq:metadata',
    ttl: 86400 * 7, // 7 days default TTL
  },
  ci: {
    artifactsUrl: process.env.CI_ARTIFACTS_URL,
    token: process.env.CI_TOKEN,
    hashFile: 'persisted-queries.json',
  },
  sync: {
    batchSize: 100,
    maxRetries: 3,
    backupEnabled: true,
  },
};

class PQHashSyncer {
  constructor() {
    this.redis = null;
    this.stats = {
      total: 0,
      added: 0,
      updated: 0,
      removed: 0,
      errors: 0,
      startTime: Date.now(),
    };
  }

  async connect() {
    this.redis = createClient({ url: config.redis.url });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    await this.redis.connect();
    console.log('✅ Connected to Redis');
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      console.log('✅ Disconnected from Redis');
    }
  }

  async fetchHashesFromArtifacts() {
    const { artifactsUrl, token, hashFile } = config.ci;

    if (!artifactsUrl) {
      throw new Error('CI_ARTIFACTS_URL environment variable required');
    }

    const url = `${artifactsUrl}/${hashFile}`;
    const headers = {
      'User-Agent': 'intelgraph-pq-sync/1.0',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    console.log(`📥 Fetching hashes from: ${url}`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch artifacts: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log(
      `📦 Downloaded ${Object.keys(data.hashes || {}).length} hashes from artifacts`,
    );

    return this.validateAndTransformHashes(data);
  }

  async loadHashesFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Hash file not found: ${filePath}`);
    }

    console.log(`📁 Loading hashes from: ${filePath}`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(
      `📦 Loaded ${Object.keys(data.hashes || {}).length} hashes from file`,
    );

    return this.validateAndTransformHashes(data);
  }

  validateAndTransformHashes(data) {
    if (!data.hashes || typeof data.hashes !== 'object') {
      throw new Error('Invalid hash data format: missing "hashes" object');
    }

    const validated = [];
    const metadata = {
      version: data.version || '1.0',
      generated_at: data.generated_at || new Date().toISOString(),
      source: data.source || 'unknown',
      checksum: data.checksum,
    };

    for (const [hash, info] of Object.entries(data.hashes)) {
      // Validate hash format (SHA256)
      if (!/^[a-f0-9]{64}$/.test(hash)) {
        console.warn(`⚠️  Invalid hash format, skipping: ${hash}`);
        this.stats.errors++;
        continue;
      }

      validated.push({
        hash,
        query_name: info.query_name || info.name,
        operation_type: info.operation_type || 'unknown',
        created_at: info.created_at || metadata.generated_at,
        risk_level: info.risk_level || 'low',
        estimated_cost: info.estimated_cost || 0,
      });
    }

    console.log(
      `✅ Validated ${validated.length} hashes (${this.stats.errors} errors)`,
    );

    return { hashes: validated, metadata };
  }

  async backupCurrentAllowlist() {
    if (!config.sync.backupEnabled) return null;

    console.log('💾 Creating backup of current allowlist...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `${config.redis.keyPrefix}backup:${timestamp}`;

    const currentHashes = await this.redis.sMembers(config.redis.allowlistKey);
    const currentMetadata = await this.redis.hGetAll(config.redis.metadataKey);

    const backup = {
      hashes: currentHashes,
      metadata: currentMetadata,
      backed_up_at: new Date().toISOString(),
      hash_count: currentHashes.length,
    };

    await this.redis.setEx(backupKey, 86400 * 30, JSON.stringify(backup)); // 30-day retention
    console.log(
      `💾 Backup created: ${backupKey} (${currentHashes.length} hashes)`,
    );

    return backupKey;
  }

  async syncHashes(hashData) {
    const { hashes, metadata } = hashData;
    this.stats.total = hashes.length;

    console.log(`🔄 Starting sync of ${this.stats.total} hashes...`);

    // Create backup before sync
    await this.backupCurrentAllowlist();

    // Get current allowlist for comparison
    const currentHashes = new Set(
      await this.redis.sMembers(config.redis.allowlistKey),
    );
    const newHashes = new Set(hashes.map((h) => h.hash));

    // Calculate changes
    const toAdd = hashes.filter((h) => !currentHashes.has(h.hash));
    const toRemove = [...currentHashes].filter((hash) => !newHashes.has(hash));

    console.log(
      `📊 Sync plan: +${toAdd.length} new, -${toRemove.length} removed, ${currentHashes.size} existing`,
    );

    // Remove stale hashes (with confirmation)
    if (toRemove.length > 0) {
      if (toRemove.length > currentHashes.size * 0.5) {
        throw new Error(
          `⚠️  Safety check: Attempting to remove ${toRemove.length}/${currentHashes.size} hashes (>50%). This may indicate a data issue.`,
        );
      }

      console.log(`🗑️  Removing ${toRemove.length} stale hashes...`);
      for (const hash of toRemove) {
        await this.redis.sRem(config.redis.allowlistKey, hash);
        this.stats.removed++;
      }
    }

    // Add new hashes in batches
    if (toAdd.length > 0) {
      console.log(`➕ Adding ${toAdd.length} new hashes...`);

      for (let i = 0; i < toAdd.length; i += config.sync.batchSize) {
        const batch = toAdd.slice(i, i + config.sync.batchSize);
        const hashValues = batch.map((h) => h.hash);

        await this.redis.sAdd(config.redis.allowlistKey, hashValues);
        this.stats.added += batch.length;

        console.log(
          `  📈 Batch ${Math.floor(i / config.sync.batchSize) + 1}/${Math.ceil(toAdd.length / config.sync.batchSize)}: +${batch.length} hashes`,
        );
      }
    }

    // Update metadata
    const syncMetadata = {
      ...metadata,
      synced_at: new Date().toISOString(),
      hash_count: String(newHashes.size),
      sync_stats: JSON.stringify({
        added: this.stats.added,
        removed: this.stats.removed,
        total: this.stats.total,
      }),
    };

    await this.redis.hSet(config.redis.metadataKey, syncMetadata);

    // Set TTL on allowlist key (refresh on each sync)
    await this.redis.expire(config.redis.allowlistKey, config.redis.ttl);

    console.log(`✅ Sync completed successfully`);
  }

  async verifySync(expectedCount) {
    console.log('🔍 Verifying sync results...');

    const actualCount = await this.redis.sCard(config.redis.allowlistKey);
    const metadata = await this.redis.hGetAll(config.redis.metadataKey);

    if (actualCount !== expectedCount) {
      throw new Error(
        `Verification failed: Expected ${expectedCount} hashes, found ${actualCount}`,
      );
    }

    console.log(`✅ Verification passed: ${actualCount} hashes in allowlist`);
    console.log(
      `📋 Metadata: synced_at=${metadata.synced_at}, version=${metadata.version}`,
    );

    return { actualCount, metadata };
  }

  printStats() {
    const duration = (Date.now() - this.stats.startTime) / 1000;

    console.log('\n📊 Sync Statistics:');
    console.log(`  Total processed: ${this.stats.total}`);
    console.log(`  Added: ${this.stats.added}`);
    console.log(`  Removed: ${this.stats.removed}`);
    console.log(`  Errors: ${this.stats.errors}`);
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    console.log(
      `  Rate: ${(this.stats.total / duration).toFixed(2)} hashes/sec`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    options[key.replace(/^--/, '')] = value || true;
  });

  const {
    source = 'artifacts',
    file,
    env = 'development',
    dryRun = false,
  } = options;

  console.log('🚀 IntelGraph Persisted Query Hash Sync');
  console.log(`   Environment: ${env}`);
  console.log(`   Source: ${source}`);
  console.log(`   Dry Run: ${dryRun}`);
  console.log('');

  const syncer = new PQHashSyncer();

  try {
    await syncer.connect();

    let hashData;
    if (source === 'file') {
      if (!file) {
        throw new Error('--file parameter required when --source=file');
      }
      hashData = await syncer.loadHashesFromFile(file);
    } else {
      hashData = await syncer.fetchHashesFromArtifacts();
    }

    if (dryRun) {
      console.log('🔍 DRY RUN: Would sync the following changes:');
      console.log(`  Total hashes to process: ${hashData.hashes.length}`);
      console.log(`  Metadata version: ${hashData.metadata.version}`);
      console.log(`  Generated at: ${hashData.metadata.generated_at}`);
      return;
    }

    await syncer.syncHashes(hashData);
    await syncer.verifySync(hashData.hashes.length);
    syncer.printStats();

    console.log('\n🎉 Hash sync completed successfully!');
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await syncer.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PQHashSyncer, config };
