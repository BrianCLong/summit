import fs from 'fs';
import path from 'path';

export type ThreatFinding = {
  file: string;
  pattern: string;
  line: number;
};

// Patterns derived from KONNI and general malware TTPs
const SUSPICIOUS_PATTERNS = [
  /powershell\s+-(e|enc|encodedcommand)/i,
  /iex\s*\(New-Object\s+Net\.WebClient\)/i,
  /Invoke-WebRequest.*-OutFile/i,
  /certutil.*-decode/i,
  /rundll32.*javascript:/i
];

export function auditFile(filePath: string): ThreatFinding[] {
    const findings: ThreatFinding[] = [];
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pattern of SUSPICIOUS_PATTERNS) {
                if (pattern.test(line)) {
                    findings.push({
                        file: filePath,
                        pattern: pattern.toString(),
                        line: i + 1
                    });
                }
            }
        }
    } catch (e) {
        // ignore binary or access errors
    }
    return findings;
}

export function scanForDevThreats(rootDir: string): ThreatFinding[] {
    const findings: ThreatFinding[] = [];

    function walk(dir: string) {
        if (dir.includes('node_modules') ||
            dir.includes('.git') ||
            dir.includes('dist') ||
            dir.includes('artifacts') ||
            dir.includes('packages/supplychain-guard') ||
            dir.includes('packages/threat-emulation') ||
            dir.includes('cli/scripts/install.ps1') // Allow list specific known file if needed, but dir check is safer
        ) return;

        // Specific file exclusions if dir check isn't granular enough
        if (dir.endsWith('cli/scripts')) {
             // We continue, but we need to be careful inside loop
        }

        try {
            const files = fs.readdirSync(dir);
            for (const f of files) {
                const fullPath = path.join(dir, f);
                // Symlink loop protection
                const lstat = fs.lstatSync(fullPath);
                if (lstat.isSymbolicLink()) continue;

                if (lstat.isDirectory()) {
                    walk(fullPath);
                } else {
                    if (fullPath.includes('cli/scripts/install.ps1')) continue;

                    const ext = path.extname(f).toLowerCase();
                    if (['.ps1', '.bat', '.sh', '.md', '.js', '.ts'].includes(ext)) {
                        const stats = fs.statSync(fullPath);
                        if (stats.size > 1024 * 1024) continue; // Skip files > 1MB
                        findings.push(...auditFile(fullPath));
                    }
                }
            }
        } catch (e) {
            // ignore access errors
        }
    }

    walk(rootDir);
    return findings;
}
