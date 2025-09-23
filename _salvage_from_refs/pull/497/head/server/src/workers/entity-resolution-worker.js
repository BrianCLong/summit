const pino = require('pino');
const crypto = require('crypto');
const { getNeo4jDriver } = require('../config/database');
const { EntityResolutionService } = require('../services/EntityResolutionService.js');

const log = pino({ name: 'entity-resolution-worker' });

async function runOnce() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  const er = new EntityResolutionService();
  try {
    const duplicates = await er.findDuplicateEntities(session);
    for (const [key, ids] of duplicates.entries()) {
      const [master, ...dups] = ids;
      const canonicalId = crypto.createHash('sha256').update(key).digest('hex');
      await er.mergeEntities(session, master, dups, canonicalId);
      log.info({ master, merged: dups }, 'merged duplicate entities');
    }
    return { mergedGroups: duplicates.size };
  } catch (err) {
    log.error({ err }, 'entity resolution worker failed');
    return { error: err.message };
  } finally {
    await session.close();
  }
}

function startEntityResolutionWorker() {
  const intervalMs = Number(process.env.ER_WORKER_INTERVAL_MS || 60 * 60 * 1000);
  const tick = () => runOnce();
  setInterval(tick, intervalMs);
  log.info(`entity resolution worker started: every ${intervalMs}ms`);
  setTimeout(tick, 5000);
  return { runOnce };
}

module.exports = { startEntityResolutionWorker, runOnce };
