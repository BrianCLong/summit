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
  if (global.gc) {
    global.gc();
  }
}

