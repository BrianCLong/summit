/**
 * Example: Policy Change Listener
 *
 * Automatically invalidates cache when policies are updated
 */

import { EventEmitter } from 'events';
import { PolicyAwareCacheService } from '../src/index.js';
import type { PolicyVersion } from '../src/index.js';

// Initialize cache service
const cache = new PolicyAwareCacheService({
  namespace: 'policy-aware',
  defaultTTL: 3600,
});

// Policy event emitter (replace with actual OPA integration)
const policyEvents = new EventEmitter();

// Listen for policy updates
policyEvents.on('policy:updated', async (event: {
  oldVersion: PolicyVersion;
  newVersion: PolicyVersion;
  updatedBy: string;
  reason: string;
}) => {
  console.log(`[POLICY CHANGE] Detected policy update from ${event.oldVersion.version} to ${event.newVersion.version}`);
  console.log(`[POLICY CHANGE] Reason: ${event.reason}`);

  try {
    // Invalidate all cache entries using the old policy
    const count = await cache.invalidateByPolicy(
      event.oldVersion,
      event.newVersion,
      event.updatedBy
    );

    console.log(`[POLICY CHANGE] ✅ Invalidated ${count} cache entries`);

    // Log to audit system
    await logPolicyChangeAudit({
      oldVersion: event.oldVersion.version,
      newVersion: event.newVersion.version,
      invalidatedCount: count,
      updatedBy: event.updatedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[POLICY CHANGE] ❌ Failed to invalidate cache:', error);
    // Alert monitoring system
    await alertMonitoring('cache-invalidation-failed', error);
  }
});

// Listen for policy rollbacks
policyEvents.on('policy:rollback', async (event: {
  fromVersion: PolicyVersion;
  toVersion: PolicyVersion;
  rollbackBy: string;
}) => {
  console.log(`[POLICY ROLLBACK] Rolling back from ${event.fromVersion.version} to ${event.toVersion.version}`);

  // Clear all cache to ensure consistency
  const count = await cache.clear();
  console.log(`[POLICY ROLLBACK] ✅ Cleared ${count} cache entries`);
});

// Simulate policy updates (replace with actual OPA webhook/polling)
async function watchPolicyChanges() {
  console.log('[POLICY WATCHER] Starting policy change watcher...');

  // Poll for policy changes every 30 seconds
  setInterval(async () => {
    try {
      const currentPolicy = await fetchCurrentPolicy();
      const previousPolicy = await fetchPreviousPolicy();

      if (currentPolicy.digest !== previousPolicy.digest) {
        policyEvents.emit('policy:updated', {
          oldVersion: previousPolicy,
          newVersion: currentPolicy,
          updatedBy: 'policy-admin',
          reason: 'Scheduled policy update',
        });
      }
    } catch (error) {
      console.error('[POLICY WATCHER] Error checking policy:', error);
    }
  }, 30000);
}

// Mock implementations (replace with actual integrations)
async function fetchCurrentPolicy(): Promise<PolicyVersion> {
  return {
    version: 'v1.2.0',
    digest: 'abc123...',
    effectiveDate: new Date().toISOString(),
  };
}

async function fetchPreviousPolicy(): Promise<PolicyVersion> {
  return {
    version: 'v1.1.0',
    digest: 'def456...',
    effectiveDate: new Date(Date.now() - 86400000).toISOString(),
  };
}

async function logPolicyChangeAudit(audit: any) {
  console.log('[AUDIT]', JSON.stringify(audit, null, 2));
}

async function alertMonitoring(type: string, error: any) {
  console.error('[ALERT]', type, error);
}

// Start watching
watchPolicyChanges();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SHUTDOWN] Closing cache service...');
  await cache.close();
  process.exit(0);
});

export { policyEvents };
