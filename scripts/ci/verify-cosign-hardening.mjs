#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const MIN_VERSION = '3.0.5';
const DEFAULT_ROOT = process.cwd();

function parseArgs(argv) {
  const options = {
    root: DEFAULT_ROOT,
    reportOut: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--root' && value) {
      options.root = path.resolve(value);
      i += 1;
    } else if (key === '--report-out' && value) {
      options.reportOut = value;
      i += 1;
    } else if (key === '--help') {
      console.log(`Usage:
  node scripts/ci/verify-cosign-hardening.mjs [options]

Options:
  --root <path>         Repository root (default: cwd)
  --report-out <path>   Optional JSON report output path
`);
      process.exit(0);
    }
  }

  return options;
}

function compareSemver(left, right) {
  const lp = left.split('.').map((v) => Number.parseInt(v, 10));
  const rp = right.split('.').map((v) => Number.parseInt(v, 10));
  for (let i = 0; i < 3; i += 1) {
    const lv = lp[i] ?? 0;
    const rv = rp[i] ?? 0;
    if (lv < rv) return -1;
    if (lv > rv) return 1;
  }
  return 0;
}

function leadingSpaces(line) {
  return line.length - line.trimStart().length;
}

function isYaml(filePath) {
  return filePath.endsWith('.yml') || filePath.endsWith('.yaml');
}

function isTextScript(filePath) {
  return (
    filePath.endsWith('.yml') ||
    filePath.endsWith('.yaml') ||
    filePath.endsWith('.sh') ||
    filePath.endsWith('.bash') ||
    filePath.endsWith('.zsh') ||
    filePath.endsWith('.mjs') ||
    filePath.endsWith('.js') ||
    filePath.endsWith('.ts')
  );
}

function shouldSkip(filePath) {
  if (filePath.includes(`${path.sep}archive${path.sep}`)) {
    return true;
  }
  if (filePath.includes(`${path.sep}.archive${path.sep}`)) {
    return true;
  }
  if (filePath.endsWith('.disabled')) {
    return true;
  }
  if (filePath.includes(`${path.sep}scripts${path.sep}ci${path.sep}__tests__${path.sep}`)) {
    return true;
  }
  if (filePath.endsWith(`${path.sep}scripts${path.sep}ci${path.sep}verify-cosign-hardening.mjs`)) {
    return true;
  }
  return false;
}

function walkFiles(rootDir, relDir, includeFn) {
  const start = path.join(rootDir, relDir);
  if (!fs.existsSync(start)) {
    return [];
  }

  const output = [];
  const stack = [start];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (shouldSkip(fullPath)) {
        continue;
      }
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (includeFn(fullPath)) {
        output.push(fullPath);
      }
    }
  }

  return output.sort((a, b) => a.localeCompare(b));
}

function addFinding(findings, file, line, message) {
  findings.push({ file, line, message });
}

function verifyCosignInstallerPins(rootDir, findings) {
  const yamlFiles = [
    ...walkFiles(rootDir, '.github/workflows', isYaml),
    ...walkFiles(rootDir, '.github/actions', isYaml),
  ];

  for (const file of yamlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].includes('sigstore/cosign-installer@')) {
        continue;
      }

      const indent = leadingSpaces(lines[i]);
      const stepLines = [lines[i]];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const candidate = lines[j];
        if (candidate.trim() !== '' && /^\s*-\s/.test(candidate) && leadingSpaces(candidate) <= indent) {
          break;
        }
        stepLines.push(candidate);
      }

      const block = stepLines.join('\n');
      const releaseMatch = block.match(/cosign-release:\s*['"]?([^'"\n]+)['"]?/);
      if (!releaseMatch) {
        addFinding(
          findings,
          file,
          i + 1,
          `cosign installer step missing cosign-release pin (required floor v${MIN_VERSION})`,
        );
        i = j - 1;
        continue;
      }

      const raw = releaseMatch[1].trim();
      if (raw.includes('${{')) {
        const hasSafeDefault = /default:\s*"3\.0\.5"/.test(content);
        const hasFloorCheck = /3\.0\.\[0-4\]/.test(content);
        if (!hasSafeDefault || !hasFloorCheck) {
          addFinding(
            findings,
            file,
            i + 1,
            `dynamic cosign-release value "${raw}" requires explicit default and floor guard for >= ${MIN_VERSION}`,
          );
        }
        i = j - 1;
        continue;
      }

      const version = raw.replace(/^v/, '');
      if (!/^\d+\.\d+\.\d+$/.test(version)) {
        addFinding(
          findings,
          file,
          i + 1,
          `unrecognized cosign-release format "${raw}"`,
        );
        i = j - 1;
        continue;
      }
      if (compareSemver(version, MIN_VERSION) < 0) {
        addFinding(
          findings,
          file,
          i + 1,
          `cosign-release ${raw} is below required minimum v${MIN_VERSION}`,
        );
      }
      i = j - 1;
    }
  }
}

function verifyNoInsecureTlogFlags(rootDir, findings) {
  const files = [
    ...walkFiles(rootDir, '.github', isTextScript),
    ...walkFiles(rootDir, 'scripts', isTextScript),
  ];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes('--insecure-ignore-tlog')) {
        addFinding(
          findings,
          file,
          i + 1,
          'found forbidden --insecure-ignore-tlog flag',
        );
      }
    }
  }
}

function verifyPolicyVersionFloor(rootDir, findings) {
  const policyPath = path.join(rootDir, '.github/policies/supplychain/verify.rego');
  if (!fs.existsSync(policyPath)) {
    return;
  }
  const content = fs.readFileSync(policyPath, 'utf8');
  const match = content.match(
    /semver\.compare\(input\.cosign\.version,\s*"(\d+\.\d+\.\d+)"\)\s*>=\s*0/,
  );
  if (!match) {
    addFinding(
      findings,
      policyPath,
      1,
      'supplychain policy missing semver floor check for cosign version',
    );
    return;
  }
  if (compareSemver(match[1], MIN_VERSION) < 0) {
    addFinding(
      findings,
      policyPath,
      1,
      `supplychain policy floor ${match[1]} is below required minimum ${MIN_VERSION}`,
    );
  }
}

function rel(rootDir, fullPath) {
  return path.relative(rootDir, fullPath) || '.';
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const findings = [];

  verifyCosignInstallerPins(options.root, findings);
  verifyNoInsecureTlogFlags(options.root, findings);
  verifyPolicyVersionFloor(options.root, findings);

  const report = {
    min_cosign_version: MIN_VERSION,
    findings: findings.map((f) => ({
      ...f,
      file: rel(options.root, f.file),
    })),
    pass: findings.length === 0,
  };

  if (options.reportOut) {
    const outPath = path.isAbsolute(options.reportOut)
      ? options.reportOut
      : path.join(options.root, options.reportOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (findings.length > 0) {
    console.error(
      `[cosign-hardening] Found ${findings.length} policy violation(s):`,
    );
    for (const finding of report.findings) {
      console.error(
        `- ${finding.file}:${finding.line} ${finding.message}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `[cosign-hardening] PASS: cosign floor and strict Rekor/TLOG policy checks satisfied (min ${MIN_VERSION}).`,
  );
}

main();
