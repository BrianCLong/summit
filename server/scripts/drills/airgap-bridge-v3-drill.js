"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AirgapService_js_1 = require("../../src/services/AirgapService.js");
const DeterministicExportService_js_1 = require("../../src/services/DeterministicExportService.js");
const quantum_identity_manager_js_1 = require("../../src/security/quantum-identity-manager.js");
const logger_js_1 = require("../../src/config/logger.js");
const path_1 = require("path");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
/**
 * Task #114: Air-Gapped Bridge v3 Drill.
 * Validates unidirectional sync with PQC signature verification.
 */
async function runAirgapBridgeDrill() {
    logger_js_1.logger.info('🚀 Starting Air-Gapped Bridge v3 Drill');
    const exportService = new DeterministicExportService_js_1.DeterministicExportService();
    const airgapService = new AirgapService_js_1.AirgapService();
    const tenantId = 'airgap-tenant-01';
    const userId = 'user-01';
    process.env.PQC_ROOT_KEY = 'drill-root-key-12345';
    process.env.AIRGAP = 'true';
    quantum_identity_manager_js_1.quantumIdentityManager.reinitialize();
    const drillsDir = (0, path_1.join)(process.cwd(), 'tmp', 'drills');
    if (!(0, fs_1.existsSync)(drillsDir))
        (0, fs_1.mkdirSync)(drillsDir, { recursive: true });
    console.log('--- Step 1: Mocking Export Bundle with PQC Signature ---');
    const exportId = 'drill-export-v3';
    const workDir = (0, path_1.join)(drillsDir, exportId);
    if (!(0, fs_1.existsSync)(workDir))
        (0, fs_1.mkdirSync)(workDir, { recursive: true });
    const entities = [{ id: 'e1', name: 'Alice' }];
    const entitiesContent = JSON.stringify(entities);
    (0, fs_1.writeFileSync)((0, path_1.join)(workDir, 'entities.json'), entitiesContent);
    const entitiesHash = (0, crypto_1.createHash)('sha256').update(entitiesContent).digest('hex');
    const manifest = await exportService.createManifest(exportId, {
        tenantId,
        userId,
        format: 'bundle'
    }, [
        { filename: 'entities.json', sha256: entitiesHash, bytes: entitiesContent.length, contentType: 'application/json', created: new Date().toISOString(), transforms: [] }
    ], []);
    (0, fs_1.writeFileSync)((0, path_1.join)(workDir, 'manifest.json'), JSON.stringify(manifest));
    const bundlePath = (0, path_1.join)(drillsDir, exportId + '.zip');
    // @ts-ignore
    exportService.tempDir = drillsDir;
    await new Promise((resolve, reject) => {
        exportService.createBundle(workDir, exportId, manifest)
            .then(() => setTimeout(resolve, 500))
            .catch(reject);
    });
    console.log('--- Step 2: Testing Import Verification ---');
    try {
        const result = await airgapService.importBundle(tenantId, bundlePath, userId);
        console.log('Import Status: ' + result.status);
        if (result.status === 'verified') {
            logger_js_1.logger.info('✅ Air-Gapped Bridge v3 Operational (PQC Verified)');
            process.exit(0);
        }
    }
    catch (err) {
        console.error('❌ Import Failed: ' + err.message);
        process.exit(1);
    }
}
runAirgapBridgeDrill().catch(err => {
    console.error('❌ Drill Failed:', err);
    process.exit(1);
});
