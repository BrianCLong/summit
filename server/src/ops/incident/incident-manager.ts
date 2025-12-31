import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export interface IncidentContext {
  incidentId: string;
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
  description: string;
  triggeredBy: string;
}

export class IncidentManager {
  private static instance: IncidentManager;
  private incidentsDir: string;

  private constructor() {
    this.incidentsDir = path.resolve(process.cwd(), 'incidents');
    if (!fs.existsSync(this.incidentsDir)) {
      fs.mkdirSync(this.incidentsDir, { recursive: true });
    }
  }

  public static getInstance(): IncidentManager {
    if (!IncidentManager.instance) {
      IncidentManager.instance = new IncidentManager();
    }
    return IncidentManager.instance;
  }

  /**
   * Captures a snapshot of the system state for a given incident.
   */
  public async captureSnapshot(context: IncidentContext): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotDir = path.join(this.incidentsDir, `${context.incidentId}_${timestamp}`);

    fs.mkdirSync(snapshotDir, { recursive: true });

    const metadata = {
      ...context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown'
    };

    fs.writeFileSync(path.join(snapshotDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Parallel capture
    await Promise.allSettled([
      this.captureEnvVars(snapshotDir),
      this.captureGitInfo(snapshotDir),
      this.captureProcessList(snapshotDir),
      this.captureMemoryUsage(snapshotDir)
    ]);

    console.log(`[IncidentManager] Snapshot captured at ${snapshotDir}`);
    return snapshotDir;
  }

  private async captureEnvVars(dir: string): Promise<void> {
    // Redact sensitive keys
    const safeEnv = Object.keys(process.env).reduce((acc, key) => {
      if (key.match(/KEY|SECRET|TOKEN|PASSWORD/i)) {
        acc[key] = '***REDACTED***';
      } else {
        acc[key] = process.env[key];
      }
      return acc;
    }, {} as Record<string, string | undefined>);

    fs.writeFileSync(path.join(dir, 'env_vars.json'), JSON.stringify(safeEnv, null, 2));
  }

  private async captureGitInfo(dir: string): Promise<void> {
    try {
      const { stdout: commit } = await execPromise('git rev-parse HEAD');
      const { stdout: status } = await execPromise('git status --porcelain');

      fs.writeFileSync(path.join(dir, 'git_info.txt'), `Commit: ${commit.trim()}\n\nStatus:\n${status}`);
    } catch (e) {
      fs.writeFileSync(path.join(dir, 'git_info_error.txt'), `Failed to capture git info: ${e}`);
    }
  }

  private async captureProcessList(dir: string): Promise<void> {
    try {
      // Basic ps command, works on Linux/Mac
      const { stdout } = await execPromise('ps aux --sort=-pcpu | head -n 20');
      fs.writeFileSync(path.join(dir, 'process_list.txt'), stdout);
    } catch (e) {
       fs.writeFileSync(path.join(dir, 'process_list_error.txt'), `Failed to capture process list: ${e}`);
    }
  }

  private async captureMemoryUsage(dir: string): Promise<void> {
      const usage = process.memoryUsage();
      fs.writeFileSync(path.join(dir, 'memory_usage.json'), JSON.stringify(usage, null, 2));
  }
}
