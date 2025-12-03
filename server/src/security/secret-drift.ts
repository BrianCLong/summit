import fs from 'fs';
import path from 'path';
import { z } from 'zod';
// We import EnvSchema. Note that importing '../config' will execute the validation logic in config.ts.
// If the environment is invalid, the process might exit. This is acceptable for now.
import { EnvSchema } from '../config.js';

export interface SecretDriftReport {
  unused: string[];
  leaked: Array<{ secret: string; file: string; line: number }>;
  expired: string[];
}

export class SecretDriftDetector {
  private envFilePath: string;

  constructor(envFilePath?: string) {
    // Default to .env in the current working directory (usually server root or repo root)
    this.envFilePath = envFilePath || path.resolve(process.cwd(), '.env');
  }

  /**
   * Detects unused secrets.
   * "Unused" here implies keys present in the .env file
   * that are NOT defined in the EnvSchema.
   */
  public detectUnusedSecrets(): string[] {
    // 1. Get keys from EnvSchema
    const schemaKeys = Object.keys(EnvSchema.shape);

    // 2. Get keys from .env file
    if (!fs.existsSync(this.envFilePath)) {
      console.warn(`[SecretDrift] No .env file found at ${this.envFilePath}`);
      return [];
    }

    const envContent = fs.readFileSync(this.envFilePath, 'utf-8');
    const envKeys = envContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim());

    // 3. Filter out keys that are in schema or are known system/comment lines
    const unused = envKeys.filter(key => !schemaKeys.includes(key));

    return unused;
  }

  /**
   * Detects leaked secrets in the codebase.
   * Scans server/src directory for values of sensitive secrets.
   */
  public detectLeakedSecrets(): Array<{ secret: string; file: string; line: number }> {
    // Identify sensitive keys heuristically
    const sensitiveKeys = Object.keys(EnvSchema.shape).filter(k => {
      const upper = k.toUpperCase();
      return upper.includes('SECRET') ||
             upper.includes('PASSWORD') ||
             upper.includes('KEY') ||
             upper.includes('TOKEN') ||
             upper.includes('AUTH');
    });

    const leaks: Array<{ secret: string; file: string; line: number }> = [];

    // Assume we are in server/src/security
    // Go up two levels to reach server/src
    // But __dirname might be different in ESM.
    // We'll assume the standard structure relative to this file.
    // If run with ts-node, __dirname is valid.
    // Ideally we scan the whole 'src' directory.
    const srcDir = path.resolve(process.cwd(), 'src');

    if (!fs.existsSync(srcDir)) {
         console.warn(`[SecretDrift] src directory not found at ${srcDir}`);
         return [];
    }

    const scanFile = (filePath: string) => {
      // Skip test files to avoid false positives in mocks, although leaking real secrets in tests is bad too.
      // But snapshots might contain them?
      // Let's scan everything for now, maybe exclude node_modules or dist.
      if (filePath.includes('node_modules') || filePath.includes('.git')) return;

      const content = fs.readFileSync(filePath, 'utf-8');

      sensitiveKeys.forEach(key => {
        const value = process.env[key];
        // Only check for secrets that are long enough to be unique/meaningful
        if (value && value.length > 8 && content.includes(value)) {
            // Find line number
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.includes(value)) {
                     // Check if it's the config file itself or the .env loading part
                     if (filePath.endsWith('config.ts') || filePath.endsWith('.env')) return;

                     leaks.push({ secret: key, file: filePath, line: idx + 1 });
                }
            });
        }
      });
    };

    const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        files.forEach(f => {
            const fp = path.join(dir, f);
            if (fs.statSync(fp).isDirectory()) {
                walkDir(fp);
            } else if (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json')) {
                scanFile(fp);
            }
        });
    };

    walkDir(srcDir);
    return leaks;
  }

  /**
   * Detects potentially expired or insecure secrets.
   */
  public detectExpiredSecrets(): string[] {
    const expired: string[] = [];
    const env = process.env;

    Object.keys(EnvSchema.shape).forEach(key => {
        const val = env[key];
        if (!val) return;

        // 1. Insecure defaults
        if (val.includes('changeme') || val.includes('devpassword') || val === 'secret') {
            expired.push(`${key} (insecure default detected)`);
        }

        // 2. Heuristic: check if there's a corresponding _EXPIRY key in env that is passed
        const expiryKey = `${key}_EXPIRY`;
        if (env[expiryKey]) {
            const expiryDate = new Date(env[expiryKey] as string);
            if (!isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
                expired.push(`${key} (expired on ${expiryDate.toISOString()})`);
            }
        }
    });

    return expired;
  }

  /**
   * Enforces removal of unused keys from the .env file.
   */
  public enforceRemoval(keysToRemove: string[]): void {
      if (!fs.existsSync(this.envFilePath)) return;

      let content = fs.readFileSync(this.envFilePath, 'utf-8');
      const lines = content.split('\n');
      const newLines = lines.filter(line => {
          const key = line.split('=')[0].trim();
          if (keysToRemove.includes(key)) {
              console.log(`[SecretDrift] Removing ${key} from .env`);
              return false;
          }
          return true;
      });

      fs.writeFileSync(this.envFilePath, newLines.join('\n'));
  }

  public async runAudit(autoFix: boolean = false): Promise<SecretDriftReport> {
      console.log('Running Secret Drift Audit...');

      const unused = this.detectUnusedSecrets();
      if (unused.length > 0) {
          console.log(`Found ${unused.length} unused secrets: ${unused.join(', ')}`);
          if (autoFix) {
              this.enforceRemoval(unused);
              console.log('Auto-removed unused secrets.');
          }
      } else {
          console.log('No unused secrets found.');
      }

      const leaked = this.detectLeakedSecrets();
      if (leaked.length > 0) {
          console.warn(`Found ${leaked.length} leaked secrets in codebase!`);
          leaked.forEach(l => console.warn(`  - ${l.secret} in ${l.file}:${l.line}`));
      } else {
          console.log('No leaked secrets found.');
      }

      const expired = this.detectExpiredSecrets();
      if (expired.length > 0) {
          console.warn(`Found ${expired.length} potentially expired/insecure secrets:`);
          expired.forEach(e => console.warn(`  - ${e}`));
      } else {
          console.log('No expired secrets found.');
      }

      return { unused, leaked, expired };
  }
}
