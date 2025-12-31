import fs from 'fs';
import path from 'path';

interface RegimeConfig {
  name: string;
  staticFiles: string[];
  mappingFiles: string[];
  timeBoundedDirs: string[];
}

interface ProfileDefinition {
  retentionDays: number;
  residency: 'none' | 'us' | 'eu' | 'custom';
  auditLogging: 'required' | 'optional';
  provenanceSink: 'required' | 'optional';
  changeApprovals: 'codeowners' | 'manual';
  supplierAttestations: 'required' | 'optional';
}

const REGIMES: Record<string, RegimeConfig> = {
  'soc2-type-ii': {
    name: 'SOC 2 Type II',
    staticFiles: [
      'docs/governance/CONSTITUTION.md',
      'docs/governance/META_GOVERNANCE.md',
      'docs/governance/AGENT_MANDATES.md',
      'COMPLIANCE_CONTROLS.md',
      'COMPLIANCE_SOC_MAPPING.md',
      'docs/regulatory/soc2-type-ii/CONTROL_MAPPING.md',
      'docs/regulatory/soc2-type-ii/GAP_ANALYSIS.md',
      'docs/regulatory/soc2-type-ii/AUDIT_PLAYBOOK.md',
      'docs/regulatory/soc2-type-ii/EVIDENCE_INDEX.md',
      'docs/regulatory/PROFILES.md',
      'docs/regulatory/SELECTION.md',
      'docs/regulatory/OPERATIONS.md',
      'ga-graphai/packages/prov-ledger/README.md',
      'docs/observability/phase-1-delivery-runbook.md',
      'RUNBOOKS',
      'BACKUP_RESTORE_DR_GUIDE.md',
      'Makefile',
      '.github/workflows/pr-quality-gate.yml',
      '.husky/commit-msg',
      '.husky/pre-commit',
      '.github/CODEOWNERS',
      'server/src/config.ts',
      'smoke_test_output.txt'
    ],
    mappingFiles: ['COMPLIANCE_SOC_MAPPING.md'],
    timeBoundedDirs: ['artifacts/provenance', 'artifacts/security', 'artifacts/agent-runs']
  },
  'iso-iec-27001': {
    name: 'ISO/IEC 27001:2022',
    staticFiles: [
      'docs/governance/CONSTITUTION.md',
      'docs/governance/META_GOVERNANCE.md',
      'COMPLIANCE_CONTROLS.md',
      'docs/regulatory/iso-iec-27001/CONTROL_MAPPING.md',
      'docs/regulatory/iso-iec-27001/GAP_ANALYSIS.md',
      'docs/regulatory/iso-iec-27001/AUDIT_PLAYBOOK.md',
      'docs/regulatory/iso-iec-27001/EVIDENCE_INDEX.md',
      'docs/regulatory/PROFILES.md',
      'docs/regulatory/SELECTION.md',
      'docs/regulatory/OPERATIONS.md',
      'ga-graphai/packages/prov-ledger/README.md',
      'docs/observability/phase-1-delivery-runbook.md',
      'RUNBOOKS',
      'BACKUP_RESTORE_DR_GUIDE.md',
      'Makefile',
      '.github/workflows/pr-quality-gate.yml',
      '.husky/commit-msg',
      '.husky/pre-commit',
      '.github/CODEOWNERS',
      'server/src/config.ts'
    ],
    mappingFiles: [],
    timeBoundedDirs: ['artifacts/provenance', 'artifacts/security', 'artifacts/agent-runs', 'artifacts/regulatory/iso-iec-27001/suppliers']
  }
};

const PROFILES: Record<string, ProfileDefinition> = {
  'soc2-us-default': {
    residency: 'none',
    retentionDays: 180,
    auditLogging: 'required',
    provenanceSink: 'required',
    changeApprovals: 'codeowners',
    supplierAttestations: 'optional'
  },
  'iso-eu-default': {
    residency: 'eu',
    retentionDays: 365,
    auditLogging: 'required',
    provenanceSink: 'required',
    changeApprovals: 'codeowners',
    supplierAttestations: 'required'
  }
};

interface ParsedArgs {
  regime: string;
  from?: Date;
  to?: Date;
  outDir: string;
  profile?: string;
  validateProfile: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    regime: '',
    outDir: '',
    validateProfile: false
  } as ParsedArgs;

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    switch (key) {
      case '--regime':
        args.regime = value;
        i += 1;
        break;
      case '--from':
        args.from = new Date(value);
        i += 1;
        break;
      case '--to':
        args.to = new Date(value);
        i += 1;
        break;
      case '--out':
        args.outDir = value;
        i += 1;
        break;
      case '--profile':
        args.profile = value;
        i += 1;
        break;
      case '--validate-profile':
        args.validateProfile = true;
        i -= 1; // no value consumed
        break;
      default:
        break;
    }
  }

  if (!args.regime || !REGIMES[args.regime]) {
    throw new Error(`Unknown or missing regime. Supported: ${Object.keys(REGIMES).join(', ')}`);
  }

  if (!args.from || Number.isNaN(args.from.valueOf()) || !args.to || Number.isNaN(args.to.valueOf())) {
    throw new Error('Both --from and --to must be provided as ISO-8601 timestamps');
  }

  if (!args.outDir) {
    args.outDir = path.join('artifacts', 'regulatory', args.regime);
  }

  return args;
}

function ensureDir(target: string) {
  fs.mkdirSync(target, { recursive: true });
}

function copyFilePreserve(relativePath: string, destinationRoot: string, gaps: string[], copied: string[]) {
  if (!fs.existsSync(relativePath)) {
    gaps.push(`Missing: ${relativePath}`);
    return;
  }
  const srcStat = fs.statSync(relativePath);
  if (srcStat.isDirectory()) {
    copyDirectory(relativePath, destinationRoot, gaps, copied);
    return;
  }
  const destPath = path.join(destinationRoot, relativePath);
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(relativePath, destPath);
  copied.push(relativePath);
}

function copyDirectory(relativeDir: string, destinationRoot: string, gaps: string[], copied: string[]) {
  if (!fs.existsSync(relativeDir)) {
    gaps.push(`Missing directory: ${relativeDir}`);
    return;
  }
  const entries = fs.readdirSync(relativeDir);
  entries.forEach((entry) => {
    const current = path.join(relativeDir, entry);
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      copyDirectory(current, destinationRoot, gaps, copied);
    } else {
      const destPath = path.join(destinationRoot, current);
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(current, destPath);
      copied.push(current);
    }
  });
}

function copyTimeBoundedFiles(basePath: string, destinationRoot: string, from: Date, to: Date, gaps: string[], copied: string[]) {
  if (!fs.existsSync(basePath)) {
    gaps.push(`Missing time-bounded path: ${basePath}`);
    return;
  }
  const stat = fs.statSync(basePath);
  if (stat.isFile()) {
    const mtime = stat.mtime.getTime();
    if (mtime >= from.getTime() && mtime <= to.getTime()) {
      copyFilePreserve(basePath, destinationRoot, gaps, copied);
    }
    return;
  }

  const entries = fs.readdirSync(basePath);
  entries.forEach((entry) => {
    const current = path.join(basePath, entry);
    const itemStat = fs.statSync(current);
    if (itemStat.isDirectory()) {
      copyTimeBoundedFiles(current, destinationRoot, from, to, gaps, copied);
    } else {
      const mtime = itemStat.mtime.getTime();
      if (mtime >= from.getTime() && mtime <= to.getTime()) {
        const destPath = path.join(destinationRoot, current);
        ensureDir(path.dirname(destPath));
        fs.copyFileSync(current, destPath);
        copied.push(current);
      }
    }
  });
}

function snapshotProfile(profileName: string, outDir: string, gaps: string[]): ProfileDefinition | undefined {
  const profile = PROFILES[profileName];
  if (!profile) {
    gaps.push(`Unknown profile: ${profileName}`);
    return undefined;
  }
  const profilePath = path.join(outDir, 'profile.json');
  ensureDir(path.dirname(profilePath));
  fs.writeFileSync(profilePath, JSON.stringify({ profile: profileName, settings: profile }, null, 2));
  return profile;
}

function validateProfile(profileName: string, profile?: ProfileDefinition): boolean {
  const definition = profile || PROFILES[profileName];
  if (!definition) {
    console.error(`Profile ${profileName} is not defined.`);
    return false;
  }
  if (definition.auditLogging !== 'required' || definition.provenanceSink !== 'required') {
    console.error('Profiles must require audit logging and provenance sink.');
    return false;
  }
  if (profileName === 'soc2-us-default' && definition.retentionDays < 180) {
    console.error('SOC2 profile retention must be at least 180 days.');
    return false;
  }
  if (profileName === 'iso-eu-default' && definition.retentionDays < 365) {
    console.error('ISO EU profile retention must be at least 365 days.');
    return false;
  }
  return true;
}

function writeManifest(outDir: string, regime: string, copied: string[], gaps: string[], profileName?: string) {
  const manifest = {
    regime,
    generated_at: new Date().toISOString(),
    copied,
    gaps,
    profile: profileName || null
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outDir, 'gaps.json'), JSON.stringify({ gaps }, null, 2));
}

function main() {
  const args = parseArgs(process.argv);
  const regimeConfig = REGIMES[args.regime];
  const gaps: string[] = [];
  const copied: string[] = [];
  ensureDir(args.outDir);

  regimeConfig.staticFiles.forEach((filePath) => copyFilePreserve(filePath, args.outDir, gaps, copied));
  regimeConfig.timeBoundedDirs.forEach((dir) => copyTimeBoundedFiles(dir, args.outDir, args.from as Date, args.to as Date, gaps, copied));

  let profileDef: ProfileDefinition | undefined;
  if (args.profile) {
    profileDef = snapshotProfile(args.profile, args.outDir, gaps);
    if (args.validateProfile && args.profile) {
      const valid = validateProfile(args.profile, profileDef);
      if (!valid) {
        writeManifest(args.outDir, args.regime, copied, [...gaps, 'Profile validation failed'], args.profile);
        process.exit(1);
      }
    }
  } else if (args.validateProfile) {
    gaps.push('Profile validation requested but no profile supplied');
    writeManifest(args.outDir, args.regime, copied, gaps);
    process.exit(1);
  }

  writeManifest(args.outDir, args.regime, copied, gaps, args.profile);
  console.log(`Evidence export complete for ${regimeConfig.name}. Files copied: ${copied.length}. Gaps: ${gaps.length}. Output: ${args.outDir}`);
}

main();
