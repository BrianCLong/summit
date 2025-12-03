/**
 * Air-Gapped Vulnerability Management Service
 * @module server/src/security/airgap-vuln-manager
 *
 * Provides vulnerability management capabilities for air-gapped environments
 * with local database storage and offline scanning support.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface VulnerabilityEntry {
  id: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  cvssScore?: number;
  cvssVector?: string;
  title: string;
  description: string;
  affectedPackages: string[];
  fixedVersions: Record<string, string>;
  publishedDate: string;
  lastModifiedDate: string;
  references: string[];
  exploitAvailable?: boolean;
  epssScore?: number;
  cisaKev?: boolean;
}

export interface SBOMEntry {
  id: string;
  name: string;
  version: string;
  timestamp: string;
  componentCount: number;
  digest: string;
  signatureValid?: boolean;
  attestationId?: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  target: string;
  targetType: string;
  scanner: string;
  status: 'success' | 'failed' | 'partial';
  duration: number;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    fixable: number;
  };
  policyPassed: boolean;
}

export interface DashboardData {
  summary: {
    totalScans: number;
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    fixableCount: number;
    sbomCount: number;
    attestationCount: number;
    lastScanTime?: string;
    policyPassRate: number;
  };
  recentScans: ScanHistoryEntry[];
  sboms: SBOMEntry[];
  topVulnerabilities: VulnerabilityEntry[];
  trendData: {
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
  policyViolations: {
    id: string;
    vulnerabilityId: string;
    severity: string;
    service: string;
    timestamp: string;
  }[];
}

export interface AirGapConfig {
  dataDir: string;
  vulnDbPath: string;
  sbomStorePath: string;
  scanHistoryPath: string;
  maxHistoryEntries: number;
  retentionDays: number;
}

/**
 * Air-Gapped Vulnerability Manager
 */
export class AirGapVulnManager {
  private config: AirGapConfig;
  private vulnDb: Map<string, VulnerabilityEntry> = new Map();
  private sbomStore: Map<string, SBOMEntry> = new Map();
  private scanHistory: ScanHistoryEntry[] = [];
  private initialized = false;

  constructor(config?: Partial<AirGapConfig>) {
    this.config = {
      dataDir: config?.dataDir || process.env.VULN_DATA_DIR || '/var/lib/intelgraph/security',
      vulnDbPath: config?.vulnDbPath || 'vuln-db.json',
      sbomStorePath: config?.sbomStorePath || 'sbom-store.json',
      scanHistoryPath: config?.scanHistoryPath || 'scan-history.json',
      maxHistoryEntries: config?.maxHistoryEntries || 1000,
      retentionDays: config?.retentionDays || 90,
    };
  }

  /**
   * Initialize the vulnerability manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔒 Initializing Air-Gapped Vulnerability Manager...');

    try {
      // Ensure data directory exists
      await fs.mkdir(this.config.dataDir, { recursive: true });

      // Load existing data
      await Promise.all([
        this.loadVulnDb(),
        this.loadSBOMStore(),
        this.loadScanHistory(),
      ]);

      // Clean up old entries
      await this.cleanupOldData();

      this.initialized = true;
      console.log('✅ Air-Gapped Vulnerability Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize vulnerability manager:', error);
      throw error;
    }
  }

  /**
   * Load vulnerability database
   */
  private async loadVulnDb(): Promise<void> {
    const dbPath = path.join(this.config.dataDir, this.config.vulnDbPath);

    try {
      const data = await fs.readFile(dbPath, 'utf-8');
      const entries: VulnerabilityEntry[] = JSON.parse(data);

      this.vulnDb.clear();
      for (const entry of entries) {
        this.vulnDb.set(entry.id, entry);
      }

      console.log(`📚 Loaded ${this.vulnDb.size} vulnerability entries`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('📚 No existing vulnerability database, starting fresh');
      } else {
        throw error;
      }
    }
  }

  /**
   * Load SBOM store
   */
  private async loadSBOMStore(): Promise<void> {
    const storePath = path.join(this.config.dataDir, this.config.sbomStorePath);

    try {
      const data = await fs.readFile(storePath, 'utf-8');
      const entries: SBOMEntry[] = JSON.parse(data);

      this.sbomStore.clear();
      for (const entry of entries) {
        this.sbomStore.set(entry.id, entry);
      }

      console.log(`📦 Loaded ${this.sbomStore.size} SBOM entries`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('📦 No existing SBOM store, starting fresh');
      } else {
        throw error;
      }
    }
  }

  /**
   * Load scan history
   */
  private async loadScanHistory(): Promise<void> {
    const historyPath = path.join(this.config.dataDir, this.config.scanHistoryPath);

    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      this.scanHistory = JSON.parse(data);

      console.log(`📊 Loaded ${this.scanHistory.length} scan history entries`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('📊 No existing scan history, starting fresh');
        this.scanHistory = [];
      } else {
        throw error;
      }
    }
  }

  /**
   * Save all data to disk
   */
  async persist(): Promise<void> {
    await Promise.all([
      this.saveVulnDb(),
      this.saveSBOMStore(),
      this.saveScanHistory(),
    ]);
  }

  private async saveVulnDb(): Promise<void> {
    const dbPath = path.join(this.config.dataDir, this.config.vulnDbPath);
    const entries = Array.from(this.vulnDb.values());
    await fs.writeFile(dbPath, JSON.stringify(entries, null, 2));
  }

  private async saveSBOMStore(): Promise<void> {
    const storePath = path.join(this.config.dataDir, this.config.sbomStorePath);
    const entries = Array.from(this.sbomStore.values());
    await fs.writeFile(storePath, JSON.stringify(entries, null, 2));
  }

  private async saveScanHistory(): Promise<void> {
    const historyPath = path.join(this.config.dataDir, this.config.scanHistoryPath);
    await fs.writeFile(historyPath, JSON.stringify(this.scanHistory, null, 2));
  }

  /**
   * Clean up old data based on retention policy
   */
  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    const cutoffTime = cutoffDate.toISOString();

    // Clean scan history
    const originalLength = this.scanHistory.length;
    this.scanHistory = this.scanHistory
      .filter((entry) => entry.timestamp > cutoffTime)
      .slice(-this.config.maxHistoryEntries);

    if (this.scanHistory.length < originalLength) {
      console.log(`🗑️  Cleaned up ${originalLength - this.scanHistory.length} old scan entries`);
    }
  }

  /**
   * Import vulnerabilities from external source
   */
  async importVulnerabilities(vulnerabilities: VulnerabilityEntry[]): Promise<number> {
    let imported = 0;

    for (const vuln of vulnerabilities) {
      const existing = this.vulnDb.get(vuln.id);

      // Update if new or modified more recently
      if (!existing || vuln.lastModifiedDate > existing.lastModifiedDate) {
        this.vulnDb.set(vuln.id, vuln);
        imported++;
      }
    }

    if (imported > 0) {
      await this.saveVulnDb();
      console.log(`📥 Imported ${imported} vulnerability entries`);
    }

    return imported;
  }

  /**
   * Record SBOM
   */
  async recordSBOM(sbom: SBOMEntry): Promise<void> {
    this.sbomStore.set(sbom.id, sbom);
    await this.saveSBOMStore();
    console.log(`📦 Recorded SBOM: ${sbom.name} v${sbom.version}`);
  }

  /**
   * Record scan result
   */
  async recordScan(scan: ScanHistoryEntry): Promise<void> {
    this.scanHistory.unshift(scan);

    // Limit history size
    if (this.scanHistory.length > this.config.maxHistoryEntries) {
      this.scanHistory = this.scanHistory.slice(0, this.config.maxHistoryEntries);
    }

    await this.saveScanHistory();
  }

  /**
   * Get vulnerability by ID
   */
  getVulnerability(id: string): VulnerabilityEntry | undefined {
    return this.vulnDb.get(id);
  }

  /**
   * Search vulnerabilities
   */
  searchVulnerabilities(query: {
    severity?: string[];
    package?: string;
    hasExploit?: boolean;
    cisaKev?: boolean;
    limit?: number;
  }): VulnerabilityEntry[] {
    let results = Array.from(this.vulnDb.values());

    if (query.severity?.length) {
      results = results.filter((v) => query.severity!.includes(v.severity));
    }

    if (query.package) {
      const pkg = query.package.toLowerCase();
      results = results.filter((v) =>
        v.affectedPackages.some((p) => p.toLowerCase().includes(pkg))
      );
    }

    if (query.hasExploit !== undefined) {
      results = results.filter((v) => v.exploitAvailable === query.hasExploit);
    }

    if (query.cisaKev !== undefined) {
      results = results.filter((v) => v.cisaKev === query.cisaKev);
    }

    // Sort by severity and CVSS score
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 };
    results.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return (b.cvssScore || 0) - (a.cvssScore || 0);
    });

    return results.slice(0, query.limit || 100);
  }

  /**
   * Get SBOM by ID
   */
  getSBOM(id: string): SBOMEntry | undefined {
    return this.sbomStore.get(id);
  }

  /**
   * Get all SBOMs
   */
  getAllSBOMs(): SBOMEntry[] {
    return Array.from(this.sbomStore.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get recent scans
   */
  getRecentScans(limit: number = 10): ScanHistoryEntry[] {
    return this.scanHistory.slice(0, limit);
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const recentScans = this.getRecentScans(10);
    const sboms = this.getAllSBOMs().slice(0, 20);
    const topVulns = this.searchVulnerabilities({
      severity: ['critical', 'high'],
      limit: 20,
    });

    // Calculate summary statistics
    const allScans = this.scanHistory;
    const passedScans = allScans.filter((s) => s.policyPassed).length;

    const summary = {
      totalScans: allScans.length,
      totalVulnerabilities: this.vulnDb.size,
      criticalCount: Array.from(this.vulnDb.values()).filter((v) => v.severity === 'critical').length,
      highCount: Array.from(this.vulnDb.values()).filter((v) => v.severity === 'high').length,
      mediumCount: Array.from(this.vulnDb.values()).filter((v) => v.severity === 'medium').length,
      lowCount: Array.from(this.vulnDb.values()).filter((v) => v.severity === 'low').length,
      fixableCount: Array.from(this.vulnDb.values()).filter(
        (v) => Object.keys(v.fixedVersions).length > 0
      ).length,
      sbomCount: this.sbomStore.size,
      attestationCount: sboms.filter((s) => s.attestationId).length,
      lastScanTime: recentScans[0]?.timestamp,
      policyPassRate: allScans.length > 0 ? (passedScans / allScans.length) * 100 : 100,
    };

    // Calculate trend data (last 30 days)
    const trendData = this.calculateTrendData(30);

    // Get recent policy violations
    const policyViolations = this.getRecentPolicyViolations(10);

    return {
      summary,
      recentScans,
      sboms,
      topVulnerabilities: topVulns,
      trendData,
      policyViolations,
    };
  }

  /**
   * Calculate trend data
   */
  private calculateTrendData(days: number): DashboardData['trendData'] {
    const trendData: DashboardData['trendData'] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Find scans for this date
      const dayScans = this.scanHistory.filter(
        (s) => s.timestamp.startsWith(dateStr)
      );

      // Aggregate counts
      const counts = dayScans.reduce(
        (acc, scan) => ({
          critical: acc.critical + scan.summary.critical,
          high: acc.high + scan.summary.high,
          medium: acc.medium + scan.summary.medium,
          low: acc.low + scan.summary.low,
        }),
        { critical: 0, high: 0, medium: 0, low: 0 }
      );

      trendData.push({ date: dateStr, ...counts });
    }

    return trendData;
  }

  /**
   * Get recent policy violations
   */
  private getRecentPolicyViolations(limit: number): DashboardData['policyViolations'] {
    const violations: DashboardData['policyViolations'] = [];

    for (const scan of this.scanHistory) {
      if (!scan.policyPassed) {
        // Record as a violation
        violations.push({
          id: crypto.randomUUID(),
          vulnerabilityId: 'multiple',
          severity: scan.summary.critical > 0 ? 'critical' : 'high',
          service: scan.target,
          timestamp: scan.timestamp,
        });
      }

      if (violations.length >= limit) break;
    }

    return violations;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<{
    generatedAt: string;
    period: { start: string; end: string };
    summary: DashboardData['summary'];
    metrics: {
      averageScanFrequency: number;
      mttr: number; // Mean time to remediate
      sbomCoverage: number;
      attestationCoverage: number;
    };
    recommendations: string[];
  }> {
    const dashboardData = await this.getDashboardData();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentScans = this.scanHistory.filter(
      (s) => new Date(s.timestamp) > thirtyDaysAgo
    );

    const recommendations: string[] = [];

    // Generate recommendations based on data
    if (dashboardData.summary.criticalCount > 0) {
      recommendations.push('Address critical vulnerabilities immediately');
    }

    if (dashboardData.summary.policyPassRate < 90) {
      recommendations.push('Improve policy compliance by addressing recurring violations');
    }

    if (dashboardData.summary.sbomCount < 5) {
      recommendations.push('Generate SBOMs for all production services');
    }

    return {
      generatedAt: now.toISOString(),
      period: {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString(),
      },
      summary: dashboardData.summary,
      metrics: {
        averageScanFrequency: recentScans.length / 30,
        mttr: 0, // Would need remediation tracking
        sbomCoverage: (dashboardData.summary.sbomCount / 10) * 100, // Assuming 10 services
        attestationCoverage:
          (dashboardData.summary.attestationCount / dashboardData.summary.sbomCount) * 100 || 0,
      },
      recommendations,
    };
  }

  /**
   * Health check
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  } {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      details: {
        initialized: this.initialized,
        vulnerabilityCount: this.vulnDb.size,
        sbomCount: this.sbomStore.size,
        scanHistoryCount: this.scanHistory.length,
        dataDir: this.config.dataDir,
      },
    };
  }
}

// Singleton instance
let instance: AirGapVulnManager | null = null;

export function getAirGapVulnManager(config?: Partial<AirGapConfig>): AirGapVulnManager {
  if (!instance) {
    instance = new AirGapVulnManager(config);
  }
  return instance;
}

export async function initializeAirGapVulnManager(
  config?: Partial<AirGapConfig>
): Promise<AirGapVulnManager> {
  const manager = getAirGapVulnManager(config);
  await manager.initialize();
  return manager;
}
