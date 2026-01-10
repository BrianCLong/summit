import fs from 'fs/promises';
import path from 'path';
import logger from '../config/logger.js';

export interface ReadinessCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'unknown';
  lastRunAt?: string;
  evidenceLinks?: string[];
}

export interface ReadinessSummary {
  generatedAt: string;
  versionOrCommit: string;
  checks: ReadinessCheck[];
}

export interface ControlMapping {
  id: string;
  name: string;
  description: string;
  enforcementPoint: string;
  evidenceArtifact: string;
}

export interface EvidenceItem {
  controlId: string;
  controlName: string;
  evidenceType: string;
  location: string;
  verificationCommand: string;
}

export interface EvidenceIndex {
  controls: ControlMapping[];
  evidence: EvidenceItem[];
}

export class ReleaseReadinessService {
  private repoRoot: string;
  private cachedSummary?: ReadinessSummary;
  private cachedEvidenceIndex?: EvidenceIndex;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheTime: number = 0;

  constructor(repoRoot: string = process.cwd()) {
    this.repoRoot = repoRoot;
  }

  /**
   * Parse CONTROL_REGISTRY.md into structured control mappings
   */
  private async parseControlRegistry(): Promise<ControlMapping[]> {
    const filePath = path.join(this.repoRoot, 'docs/compliance/CONTROL_REGISTRY.md');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const controls: ControlMapping[] = [];

      // Parse markdown table (skip header rows)
      const lines = content.split('\n');
      let inTable = false;

      for (const line of lines) {
        if (line.includes('| Control ID | Control Name |')) {
          inTable = true;
          continue;
        }
        if (line.includes('| :---')) {
          continue;
        }
        if (inTable && line.startsWith('|') && !line.includes('**GOV-') && !line.includes('**SEC-') && !line.includes('**OPS-') && !line.includes('**RISK-') && !line.includes('**AI-')) {
          // End of table
          if (!line.trim().match(/\|\s*\*\*/)) {
            break;
          }
        }

        if (inTable && line.startsWith('|')) {
          const parts = line.split('|').map((p: string) => p.trim()).filter((p: string) => p);
          if (parts.length >= 5) {
            const idMatch = parts[0].match(/\*\*([A-Z]+-\d+)\*\*/);
            if (idMatch) {
              controls.push({
                id: idMatch[1],
                name: parts[1],
                description: parts[2],
                enforcementPoint: parts[3],
                evidenceArtifact: parts[4],
              });
            }
          }
        }
      }

      return controls;
    } catch (error: any) {
      logger.error('Failed to parse CONTROL_REGISTRY.md', error);
      throw error;
    }
  }

  /**
   * Parse EVIDENCE_INDEX.md into structured evidence items
   */
  private async parseEvidenceIndex(): Promise<EvidenceItem[]> {
    const filePath = path.join(this.repoRoot, 'docs/compliance/EVIDENCE_INDEX.md');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const evidence: EvidenceItem[] = [];

      // Parse markdown table
      const lines = content.split('\n');
      let inTable = false;

      for (const line of lines) {
        if (line.includes('| Control ID | Control Name |')) {
          inTable = true;
          continue;
        }
        if (line.includes('| :---')) {
          continue;
        }

        if (inTable && line.startsWith('|')) {
          const parts = line.split('|').map((p: string) => p.trim()).filter((p: string) => p);
          if (parts.length >= 5) {
            const idMatch = parts[0].match(/\*\*([A-Z]+-\d+)\*\*/);
            if (idMatch) {
              evidence.push({
                controlId: idMatch[1],
                controlName: parts[1],
                evidenceType: parts[2],
                location: parts[3],
                verificationCommand: parts[4],
              });
            }
          }
        }
      }

      return evidence;
    } catch (error: any) {
      logger.error('Failed to parse EVIDENCE_INDEX.md', error);
      throw error;
    }
  }

  /**
   * Check if critical governance files exist
   */
  private async checkGovernanceFiles(): Promise<ReadinessCheck[]> {
    const checks: ReadinessCheck[] = [];

    const requiredFiles = [
      { path: 'docs/governance/CONSTITUTION.md', name: 'Constitutional Governance' },
      { path: 'docs/compliance/CONTROL_REGISTRY.md', name: 'Control Registry' },
      { path: 'docs/compliance/EVIDENCE_INDEX.md', name: 'Evidence Index' },
      { path: 'SECURITY.md', name: 'Security Policy' },
      { path: 'CODE_OF_CONDUCT.md', name: 'Code of Conduct' },
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.repoRoot, file.path);
      try {
        await fs.access(filePath);
        checks.push({
          id: `file-${file.path.replace(/[\/\.]/g, '-')}`,
          name: file.name,
          status: 'pass',
          lastRunAt: new Date().toISOString(),
          evidenceLinks: [file.path],
        });
      } catch {
        checks.push({
          id: `file-${file.path.replace(/[\/\.]/g, '-')}`,
          name: file.name,
          status: 'fail',
          lastRunAt: new Date().toISOString(),
          evidenceLinks: [file.path],
        });
      }
    }

    return checks;
  }

  /**
   * Get release readiness summary (cached)
   */
  async getSummary(): Promise<ReadinessSummary> {
    const now = Date.now();

    // Return cached if still valid
    if (this.cachedSummary && (now - this.lastCacheTime) < this.cacheExpiry) {
      return this.cachedSummary;
    }

    // Get git commit hash for version tracking
    let versionOrCommit = 'unknown';
    try {
      const { execSync } = await import('child_process');
      versionOrCommit = execSync('git rev-parse --short HEAD', {
        cwd: this.repoRoot,
        encoding: 'utf-8'
      }).trim();
    } catch {
      // Git not available or not a git repo
      versionOrCommit = 'no-git';
    }

    // Run readiness checks
    const checks = await this.checkGovernanceFiles();

    // Determine overall status
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;

    this.cachedSummary = {
      generatedAt: new Date().toISOString(),
      versionOrCommit,
      checks,
    };

    this.lastCacheTime = now;
    return this.cachedSummary;
  }

  /**
   * Get evidence index (cached)
   */
  async getEvidenceIndex(): Promise<EvidenceIndex> {
    const now = Date.now();

    // Return cached if still valid
    if (this.cachedEvidenceIndex && (now - this.lastCacheTime) < this.cacheExpiry) {
      return this.cachedEvidenceIndex;
    }

    const [controls, evidence] = await Promise.all([
      this.parseControlRegistry(),
      this.parseEvidenceIndex(),
    ]);

    this.cachedEvidenceIndex = { controls, evidence };
    this.lastCacheTime = now;

    return this.cachedEvidenceIndex;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cachedSummary = undefined;
    this.cachedEvidenceIndex = undefined;
    this.lastCacheTime = 0;
  }
}

// Singleton instance
export const releaseReadinessService = new ReleaseReadinessService();
