import fs from 'fs';
import path from 'path';

export type Dep = {
  name: string;
  version: string;
  sourceFile: string;
};

export type IntakeFinding = {
  dep: Dep;
  reason: string;
  severity: 'low' | 'med' | 'high';
};

export type Denylist = {
  packages: string[];
  patterns: string[];
};

export function evaluateDependencyIntake(
  deps: Dep[],
  denylist: Denylist
): IntakeFinding[] {
  const findings: IntakeFinding[] = [];
  const denySet = new Set(denylist.packages);

  for (const d of deps) {
    // Check strict denylist
    if (denySet.has(d.name)) {
      findings.push({ dep: d, reason: `denylisted-package: ${d.name}`, severity: 'high' });
    }

    // Check patterns
    for (const p of denylist.patterns) {
      if (d.name.includes(p)) {
        findings.push({ dep: d, reason: `suspicious-pattern: ${p}`, severity: 'high' });
      }
    }

    // Heuristics
    // Suspicious name length
    if (d.name.length > 60) {
       findings.push({ dep: d, reason: 'suspicious-name-length', severity: 'low' });
    }
  }

  return findings;
}

export function scanRepoDependencies(rootDir: string = '.'): Dep[] {
    const deps: Dep[] = [];

    function walk(dir: string) {
        if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('dist') || dir.includes('artifacts')) return;

        try {
            const files = fs.readdirSync(dir);
            for (const f of files) {
                const fullPath = path.join(dir, f);
                // Symlink loop protection
                const lstat = fs.lstatSync(fullPath);
                if (lstat.isSymbolicLink()) continue;

                if (lstat.isDirectory()) {
                    walk(fullPath);
                } else if (f === 'package.json') {
                    try {
                        const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                        const allDeps = {
                            ...content.dependencies,
                            ...content.devDependencies,
                            ...content.peerDependencies
                        };

                        for (const [name, version] of Object.entries(allDeps)) {
                             deps.push({
                                 name,
                                 version: version as string,
                                 sourceFile: fullPath
                             });
                        }
                    } catch (e) {
                        // ignore invalid json
                    }
                }
            }
        } catch (e) {
            // ignore access errors
        }
    }

    walk(rootDir);
    return deps;
}
