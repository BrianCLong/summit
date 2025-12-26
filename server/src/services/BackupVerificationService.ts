import logger from '../utils/logger.js';

interface BackupRecord {
  id: string;
  region: string;
  timestamp: Date;
  status: 'COMPLETED' | 'FAILED';
  verified: boolean;
  checksum: string;
}

export class BackupVerificationService {
  private static instance: BackupVerificationService;
  private backups: BackupRecord[] = [];

  private constructor() {}

  public static getInstance(): BackupVerificationService {
    if (!BackupVerificationService.instance) {
      BackupVerificationService.instance = new BackupVerificationService();
    }
    return BackupVerificationService.instance;
  }

  public simulateBackup(region: string): BackupRecord {
    const backup: BackupRecord = {
      id: `bkp-${Date.now()}`,
      region,
      timestamp: new Date(),
      status: Math.random() > 0.1 ? 'COMPLETED' : 'FAILED', // 90% success rate
      verified: false,
      checksum: `sha256-${Math.random().toString(36).substring(7)}`,
    };
    this.backups.push(backup);
    logger.info(`Backup created for ${region}: ${backup.id} (${backup.status})`);
    return backup;
  }

  public async verifyBackup(backupId: string): Promise<boolean> {
    const backup = this.backups.find((b) => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.status === 'FAILED') {
      logger.warn(`Cannot verify failed backup: ${backupId}`);
      return false;
    }

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate integrity check
    const passed = Math.random() > 0.05; // 95% pass rate
    backup.verified = passed;

    if (passed) {
        logger.info(`✅ Backup ${backupId} verified successfully. Checksum: ${backup.checksum}`);
    } else {
        logger.error(`❌ Backup ${backupId} verification FAILED. Integrity compromise detected.`);
    }

    return passed;
  }

  public getLatestVerifiedBackup(region: string): BackupRecord | undefined {
    return this.backups
      .filter((b) => b.region === region && b.verified)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  // For Customer Signals Epic
  public getEvidence(region: string): object {
      const latest = this.getLatestVerifiedBackup(region);
      return {
          region,
          hasVerifiedBackup: !!latest,
          lastVerifiedAt: latest?.timestamp || null,
          complianceStatus: latest ? 'COMPLIANT' : 'AT_RISK'
      }
  }
}
