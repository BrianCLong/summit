/**
 * Jest Global Teardown (CommonJS)
 * Runs once after all tests complete
 * Cleans up test databases, temporary files, and global resources
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Starting Jest Global Teardown...');

  try {
    await cleanupTempDirectories();
    await closeGlobalConnections();
    await clearAllTimers();
    console.log('✅ Jest Global Teardown completed successfully');
  } catch (error) {
    console.error('❌ Jest Global Teardown failed:', error);
  }
};

async function cleanupTempDirectories() {
  console.log('🗑️ Cleaning up temporary directories...');
  const tempDirs = [path.join(__dirname, '../../tmp')];
  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Could not clean up ${dir}:`, error.message);
      }
    }
  }
}

async function closeGlobalConnections() {
  console.log('🔌 Closing global connections...');

  // Clear any prom-client default metrics intervals
  try {
    const promClient = require('prom-client');
    if (promClient && promClient.register) {
      promClient.register.clear();
    }
  } catch (e) {
    // Ignore if prom-client not loaded
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}

async function clearAllTimers() {
  console.log('⏱️ Clearing all timers...');

  // Clear all active timers (Node.js internal)
  // This is aggressive but necessary for CI stability
  const activeHandles = process._getActiveHandles?.() || [];
  const activeRequests = process._getActiveRequests?.() || [];

  if (process.env.CI === 'true' || process.env.JEST_DETECT_HANDLES === 'true') {
    console.log(`Found ${activeHandles.length} active handles and ${activeRequests.length} active requests`);

    // Attempt to close any lingering handles
    for (const handle of activeHandles) {
      try {
        if (handle && typeof handle.close === 'function') {
          handle.close();
        } else if (handle && typeof handle.destroy === 'function') {
          handle.destroy();
        } else if (handle && typeof handle.end === 'function') {
          handle.end();
        }
      } catch (e) {
        // Ignore errors during aggressive cleanup
      }
    }
  }

  // Give a moment for async cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 100));
}
