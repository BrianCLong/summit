
import { AirgapService } from '../../src/services/AirgapService.js';
import { DeterministicExportService } from '../../src/services/DeterministicExportService.js';
import { QuantumIdentityManager, quantumIdentityManager } from '../../src/security/quantum-identity-manager.js';
import { logger } from '../../src/config/logger.js';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { createHash } from 'crypto';

/**
 * Task #114: Air-Gapped Bridge v3 Drill.
 * Validates unidirectional sync with PQC signature verification.
 */
async function runAirgapBridgeDrill() {
  logger.info('🚀 Starting Air-Gapped Bridge v3 Drill');

  const exportService = new DeterministicExportService();
  const airgapService = new AirgapService();

  const tenantId = 'airgap-tenant-01';
  const userId = 'user-01';

  process.env.PQC_ROOT_KEY = 'drill-root-key-12345';
  process.env.AIRGAP = 'true';
  quantumIdentityManager.reinitialize();

  const drillsDir = join(process.cwd(), 'tmp', 'drills');
  if (!existsSync(drillsDir)) mkdirSync(drillsDir, { recursive: true });

  console.log('--- Step 1: Mocking Export Bundle with PQC Signature ---');
  const exportId = 'drill-export-v3';
  const workDir = join(drillsDir, exportId);
  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

  const entities = [{ id: 'e1', name: 'Alice' }];
  const entitiesContent = JSON.stringify(entities);
  writeFileSync(join(workDir, 'entities.json'), entitiesContent);
  const entitiesHash = createHash('sha256').update(entitiesContent).digest('hex');

  const manifest = await (exportService as any).createManifest(exportId, {
    tenantId,
    userId,
    format: 'bundle'
  }, [
    { filename: 'entities.json', sha256: entitiesHash, bytes: entitiesContent.length, contentType: 'application/json', created: new Date().toISOString(), transforms: [] }
  ], []);

  writeFileSync(join(workDir, 'manifest.json'), JSON.stringify(manifest));

  const bundlePath = join(drillsDir, exportId + '.zip');
  // @ts-ignore
  exportService.tempDir = drillsDir;

  await new Promise<void>((resolve, reject) => {
    (exportService as any).createBundle(workDir, exportId, manifest)
      .then(() => setTimeout(resolve, 500))
      .catch(reject);
  });

  console.log('--- Step 2: Testing Import Verification ---');

  try {
    const result = await airgapService.importBundle(tenantId, bundlePath, userId);
    console.log('Import Status: ' + result.status);

    if (result.status === 'verified') {
      logger.info('✅ Air-Gapped Bridge v3 Operational (PQC Verified)');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('❌ Import Failed: ' + err.message);
    process.exit(1);
  }
}

runAirgapBridgeDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
