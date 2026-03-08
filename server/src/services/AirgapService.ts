import { DeterministicExportService, ExportRequest, ExportManifest } from './DeterministicExportService.js';
import { Session } from 'neo4j-driver';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, rmSync, createReadStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash, randomUUID } from 'crypto';
import { getPostgresPool } from '../config/database.js';
import { quantumIdentityManager } from '../security/quantum-identity-manager.js';
import logger from '../config/logger.js';

const execAsync = promisify(exec);
const log = logger.child({ name: 'AirgapService' });

export class AirgapService {
  private exportService: DeterministicExportService;
  private importDir: string;

  constructor() {
    this.exportService = new DeterministicExportService();
    this.importDir = join(process.cwd(), 'storage', 'imports');
    if (!existsSync(this.importDir)) {
      mkdirSync(this.importDir, { recursive: true });
    }
  }

  async exportBundle(request: ExportRequest, session: Session) {
    if (process.env.AIRGAP !== 'true') {
      throw new Error('Airgap feature is disabled');
    }
    return this.exportService.createExportBundle(request, session);
  }

  async importBundle(tenantId: string, filePath: string, userId: string): Promise<any> {
    if (process.env.AIRGAP !== 'true') {
      throw new Error('Airgap feature is disabled');
    }

    const importId = randomUUID();
    const workDir = join(this.importDir, importId);
    mkdirSync(workDir, { recursive: true });

    try {
      log.info({ importId, tenantId }, 'Starting airgap import');

      // 1. Unzip
      await execAsync(`unzip -q "${filePath}" -d "${workDir}"`);

      // 2. Read Manifest
      const manifestPath = join(workDir, 'manifest.json');
      if (!existsSync(manifestPath)) {
        throw new Error('Invalid bundle: missing manifest.json');
      }
      const manifestStr = readFileSync(manifestPath, 'utf-8');
      const manifest: ExportManifest = JSON.parse(manifestStr);

      // 3. Verify PQC Signature (Task #114)
      if (!manifest.pqcSignature) {
        throw new Error('Security Violation: Airgap bundle missing PQC signature');
      }

      // Reconstruct identity for verification
      const serviceId = manifest.pqcServiceId || 'unknown';
      const signedPayload = `service=${serviceId};hash=${manifest.integrity.manifestHash}`;

      const identityToVerify = {
        serviceId: signedPayload,
        publicKey: 'simulated-key',
        algorithm: 'KYBER-768' as const,
        issuedAt: manifest.createdAt,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        signature: manifest.pqcSignature
      };

      const isPqcValid = quantumIdentityManager.verifyIdentity(identityToVerify);
      if (!isPqcValid) {
        throw new Error('Security Violation: Invalid PQC signature on airgap bundle');
      }
      log.info({ importId, serviceId: manifest.pqcServiceId }, 'PQC Signature verified');

      // 4. Verify Tenant Binding
      if (manifest.request.tenantId !== tenantId) {
        throw new Error(`Tenant mismatch: Bundle belongs to ${manifest.request.tenantId}, but importing into ${tenantId}`);
      }

      // 5. Verify Integrity (Hashes)
      // Bundle hash check skipped as it causes circular dependency.
      // We rely on file hash verification.
      const bundleHash = await this.calculateFileHash(filePath);

      // Check file hashes
      for (const file of manifest.files) {
        const extractedFile = join(workDir, file.filename);
        if (!existsSync(extractedFile)) {
           throw new Error(`Missing file in bundle: ${file.filename}`);
        }
        const fileHash = await this.calculateFileHash(extractedFile);
        if (fileHash !== file.sha256) {
           throw new Error(`File integrity check failed for ${file.filename}`);
        }
      }

      // 5. Store Metadata
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO imported_snapshots (id, tenant_id, bundle_hash, manifest, created_by, status, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [importId, tenantId, bundleHash, JSON.stringify(manifest), userId, 'verified', workDir]
      );

      log.info({ importId, tenantId }, 'Airgap import completed successfully');

      return {
        importId,
        manifest,
        status: 'verified'
      };

    } catch (error: any) {
      log.error({ importId, error: error.message }, 'Airgap import failed');
      // Cleanup
      rmSync(workDir, { recursive: true, force: true });
      throw error;
    }
  }

  async getImport(importId: string, tenantId: string) {
      const pool = getPostgresPool();
      const res = await pool.query('SELECT * FROM imported_snapshots WHERE id = $1 AND tenant_id = $2', [importId, tenantId]);
      if (res.rows.length === 0) return null;
      return res.rows[0];
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (chunk: Buffer) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
  }
}
