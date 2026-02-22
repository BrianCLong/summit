import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

interface MelangeConfig {
  package?: {
    copyright?: Array<{
      license?: string;
      'license-path'?: string;
    }>;
  };
}

function scanFile(filePath: string): string[] {
  const errors: string[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!filePath.match(/\.ya?ml$/)) return [];

    // Check if file is empty
    if (!content.trim()) return [];

    const doc = yaml.load(content) as MelangeConfig;
    if (!doc || typeof doc !== 'object') return [];
    if (!doc.package || !doc.package.copyright) return [];

    const copyrights = doc.package.copyright;
    if (!Array.isArray(copyrights)) return [];

    copyrights.forEach((c, idx) => {
      const lp = c['license-path'];
      if (lp) {
        if (path.isAbsolute(lp)) {
            errors.push(`${filePath}: copyright[${idx}].license-path '${lp}' is absolute`);
        }
        if (lp.includes('..')) {
             errors.push(`${filePath}: copyright[${idx}].license-path '${lp}' contains traversal '..'`);
        }
      }
    });
  } catch (e: any) {
    // Only report parsing errors if we are sure it's meant to be a melange config?
    // For now, we report it as a warning or just ignore non-melange yamls if they fail parse.
    // But strict linting is better.
    errors.push(`${filePath}: Failed to parse YAML: ${e.message}`);
  }
  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const findings: string[] = [];
  let scannedCount = 0;

  const processPath = (p: string) => {
      try {
          const stat = fs.statSync(p);
          if (stat.isDirectory()) {
              if (p.includes('node_modules') || p.includes('.git')) return;
              fs.readdirSync(p).forEach(sub => processPath(path.join(p, sub)));
          } else if (stat.isFile() && p.match(/\.ya?ml$/)) {
              scannedCount++;
              findings.push(...scanFile(p));
          }
      } catch (e) {
          console.error(`Error processing path ${p}: ${e}`);
      }
  };

  if (args.length === 0) {
      processPath('.');
  } else {
      args.forEach(arg => {
          if (fs.existsSync(arg)) processPath(arg);
      });
  }

  const evidence = {
      cve: "CVE-2026-25145",
      evidenceId: "EVID:melange-config-lint",
      findings: findings,
      scanned_files_count: scannedCount,
      tool: "melange-config-lint"
  };

  const json = JSON.stringify(evidence, null, 2);
  console.log(json);
  if (process.env.GATE_OUTPUT) {
      fs.writeFileSync(process.env.GATE_OUTPUT, json);
  }

  if (findings.length > 0) {
      console.error("Config Lint Failed: Found restricted patterns in license-path");
      findings.forEach(f => console.error(f));
      process.exit(1);
  }
}

main();
