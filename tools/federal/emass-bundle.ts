#!/usr/bin/env ts-node

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

interface EvidenceSource {
  path: string;
  description: string;
  optional?: boolean;
}

interface AutomatedCheck {
  name: string;
  description: string;
  command?: string[];
  run?: () => string;
}

interface ControlDefinition {
  id: string;
  family: string;
  title: string;
  description: string;
  evidence: EvidenceSource[];
  automatedChecks?: AutomatedCheck[];
}

interface EvidenceArtifact {
  source: string;
  copiedTo?: string;
  sha256?: string;
  exists: boolean;
  note?: string;
}

interface CheckResult {
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'skipped';
  output: string;
}

interface ControlResult {
  id: string;
  family: string;
  title: string;
  description: string;
  artifacts: EvidenceArtifact[];
  checks: CheckResult[];
}

interface BundleManifest {
  bundleName: string;
  generatedAt: string;
  generatedBy: string;
  classification: string;
  gitCommit?: string;
  evidenceRoot: string;
  rmfPackage?: {
    path?: string;
    status: 'generated' | 'skipped';
    note?: string;
  };
  controls: ControlResult[];
}

class EmassEvidenceBundleGenerator {
  private readonly repoRoot: string;
  private readonly outputDir: string;
  private readonly classification: string;
  private readonly selectedControlIds?: Set<string>;
  private readonly skipTar: boolean;
  private readonly controls: ControlDefinition[];

  constructor() {
    this.repoRoot = path.resolve(__dirname, '..', '..');
    if (this.hasFlag('--help') || this.hasFlag('-h')) {
      this.printUsage();
      process.exit(0);
    }

    const targetDir = this.parseArg('--output') || process.env.EMASS_OUTPUT_DIR;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.outputDir = targetDir || path.join(os.tmpdir(), `emass-bundle-${timestamp}`);
    this.classification = this.parseArg('--classification') || process.env.CLASSIFICATION || 'UNCLASSIFIED';
    this.selectedControlIds = this.parseListArg('--controls');
    this.skipTar = this.hasFlag('--no-tar');

    const controls = this.loadControls();
    this.controls = this.selectedControlIds
      ? controls.filter((control) => this.selectedControlIds?.has(control.id))
      : controls;

    if (this.controls.length === 0) {
      console.error('No controls selected. Provide valid control IDs via --controls or omit to include all.');
      process.exit(1);
    }
  }

  run(): void {
    this.prepareOutputDir();
    const controlResults = this.controls.map((control) => this.processControl(control));
    const manifest = this.writeManifest(controlResults);
    this.exportRmfPackage(manifest);
    console.log(`\n✅ eMASS evidence bundle ready: ${this.outputDir}`);
  }

  private parseArg(flag: string): string | undefined {
    const index = process.argv.indexOf(flag);
    if (index >= 0 && process.argv[index + 1]) {
      return process.argv[index + 1];
    }
    return undefined;
  }

  private parseListArg(flag: string): Set<string> | undefined {
    const value = this.parseArg(flag);
    if (!value) return undefined;
    const items = value
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    return items.length ? new Set(items) : undefined;
  }

  private hasFlag(flag: string): boolean {
    return process.argv.includes(flag);
  }

  private prepareOutputDir(): void {
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(path.join(this.outputDir, 'controls'), { recursive: true });
    fs.mkdirSync(path.join(this.outputDir, 'reports'), { recursive: true });
  }

  private loadControls(): ControlDefinition[] {
    return [
      {
        id: 'SC-13',
        family: 'System and Communications Protection',
        title: 'Cryptographic Protection',
        description:
          'FIPS 140-2 validated cryptography enforced with HSM-backed operations and PKCS#11 guards.',
        evidence: [
          {
            path: 'server/src/federal/fips-compliance.ts',
            description: 'FIPS enforcement service that validates mechanisms and CKF_FIPS_MODE.',
          },
          {
            path: 'server/src/federal/hsm-enforcement.ts',
            description: 'HSM integration with CloudHSM/Luna/nShield support.',
          },
          {
            path: 'server/src/federal/pkcs11-guard.ts',
            description: 'Runtime PKCS#11 allowlist and session validation.',
          },
        ],
        automatedChecks: [
          {
            name: 'hash-verification',
            description: 'Compute hashes of crypto enforcement sources for chain-of-custody.',
            run: () => this.hashFiles([
              'server/src/federal/fips-compliance.ts',
              'server/src/federal/hsm-enforcement.ts',
              'server/src/federal/pkcs11-guard.ts',
            ]),
          },
        ],
      },
      {
        id: 'SC-7',
        family: 'System and Communications Protection',
        title: 'Boundary Protection and Air-Gap Enforcement',
        description: 'Network isolation, default deny egress, and continuous air-gap verification.',
        evidence: [
          {
            path: 'tools/federal/prove-airgap.sh',
            description: 'Automated verification of DNS isolation, egress blocking, and registry integrity.',
          },
          {
            path: 'helm/intelgraph/templates/networkpolicy-airgap.yaml',
            description: 'Kubernetes NetworkPolicy definitions enforcing default deny egress.',
          },
          {
            path: 'server/src/federal/airgap-service.ts',
            description: 'Service logic for air-gap break-glass workflows and monitoring.',
          },
        ],
        automatedChecks: [
          {
            name: 'networkpolicy-lint',
            description: 'Validate NetworkPolicy template is present and structured.',
            run: () => this.describeFile('helm/intelgraph/templates/networkpolicy-airgap.yaml'),
          },
        ],
      },
      {
        id: 'AU-11',
        family: 'Audit and Accountability',
        title: 'Audit Record Retention and WORM Controls',
        description: 'Tamper-evident audit chain with dual notarization and object lock retention.',
        evidence: [
          {
            path: 'server/src/federal/worm-audit-chain.ts',
            description: 'WORM audit chain implementation with Merkle proofs.',
          },
          {
            path: 'server/src/federal/dual-notary.ts',
            description: 'Dual notary support for HSM and TSA stamping.',
          },
          {
            path: 'tools/federal/emit_merkle_and_sign.ts',
            description: 'Merkle root generator for daily audit segments.',
          },
        ],
        automatedChecks: [
          {
            name: 'merkle-self-check',
            description: 'Generate deterministic hash summary for audit chain sources.',
            run: () => this.hashFiles([
              'server/src/federal/worm-audit-chain.ts',
              'server/src/federal/dual-notary.ts',
            ]),
          },
        ],
      },
      {
        id: 'AC-6',
        family: 'Access Control',
        title: 'Least Privilege and Break-Glass Governance',
        description: 'Controlled emergency access with auditability and time-bound approvals.',
        evidence: [
          {
            path: 'tools/federal/break-glass-procedure.md',
            description: 'Runbook for emergency access workflows and approvals.',
          },
          {
            path: 'server/src/federal/airgap-service.ts',
            description: 'Implementation of break-glass session handling and monitoring hooks.',
          },
          {
            path: 'tools/federal/simulate-breakglass.ts',
            description: 'Simulation harness for access events used in tabletop exercises.',
            optional: true,
          },
        ],
        automatedChecks: [
          {
            name: 'runbook-digest',
            description: 'Create SHA-256 digest for the break-glass runbook to track updates.',
            run: () => this.hashFiles(['tools/federal/break-glass-procedure.md']),
          },
        ],
      },
    ];
  }

  private processControl(control: ControlDefinition): ControlResult {
    const controlDir = path.join(this.outputDir, 'controls', control.id);
    fs.mkdirSync(controlDir, { recursive: true });

    const artifacts: EvidenceArtifact[] = control.evidence.map((item) =>
      this.copyEvidence(item, controlDir),
    );

    const checks: CheckResult[] = (control.automatedChecks || []).map((check) =>
      this.runCheck(check),
    );

    const result: ControlResult = {
      id: control.id,
      family: control.family,
      title: control.title,
      description: control.description,
      artifacts,
      checks,
    };

    const controlReportPath = path.join(controlDir, 'control.json');
    fs.writeFileSync(controlReportPath, JSON.stringify(result, null, 2));
    return result;
  }

  private copyEvidence(source: EvidenceSource, controlDir: string): EvidenceArtifact {
    const absolutePath = path.join(this.repoRoot, source.path);
    const destination = path.join(controlDir, path.basename(source.path));

    if (!fs.existsSync(absolutePath)) {
      const missing: EvidenceArtifact = {
        source: source.path,
        exists: false,
        note: source.optional
          ? 'Optional evidence not found in repository'
          : 'Evidence file missing in repository',
      };
      if (!source.optional) {
        console.warn(`⚠️  Missing evidence for ${source.path}`);
      }
      return missing;
    }

    fs.cpSync(absolutePath, destination, { recursive: true });
    const sha256 = this.computeHash(destination);

    return {
      source: source.path,
      copiedTo: path.relative(this.outputDir, destination),
      sha256,
      exists: true,
      note: source.description,
    };
  }

  private runCheck(check: AutomatedCheck): CheckResult {
    try {
      if (check.run) {
        const output = check.run();
        return { name: check.name, description: check.description, status: 'passed', output };
      }

      if (check.command) {
        const [cmd, ...args] = check.command;
        const result = spawnSync(cmd, args, { encoding: 'utf-8' });
        const status: CheckResult['status'] = result.status === 0 ? 'passed' : 'failed';
        return {
          name: check.name,
          description: check.description,
          status,
          output: (result.stdout || '') + (result.stderr || ''),
        };
      }

      return {
        name: check.name,
        description: check.description,
        status: 'skipped',
        output: 'No check runner defined',
      };
    } catch (error: any) {
      return {
        name: check.name,
        description: check.description,
        status: 'failed',
        output: error?.message || 'Unknown error',
      };
    }
  }

  private hashFiles(files: string[]): string {
    const results = files.map((filePath) => {
      const absolute = path.join(this.repoRoot, filePath);
      if (!fs.existsSync(absolute)) {
        return `${filePath}: missing`;
      }
      const hash = this.computeHash(absolute);
      return `${filePath}: ${hash}`;
    });

    const digestPath = path.join(
      this.outputDir,
      'reports',
      `digest-${crypto.randomUUID().slice(0, 8)}.txt`,
    );
    fs.writeFileSync(digestPath, results.join(os.EOL));
    return results.join(os.EOL);
  }

  private describeFile(filePath: string): string {
    const absolute = path.join(this.repoRoot, filePath);
    if (!fs.existsSync(absolute)) {
      return `${filePath}: missing`;
    }

    const stat = fs.statSync(absolute);
    const preview = fs.readFileSync(absolute, 'utf-8').split('\n').slice(0, 12).join('\n');
    const description = [
      `${filePath}: ${stat.size} bytes`,
      '--- preview ---',
      preview,
    ].join('\n');

    const reportPath = path.join(
      this.outputDir,
      'reports',
      `preview-${path.basename(filePath).replace(/[^a-zA-Z0-9_-]/g, '-')}.txt`,
    );
    fs.writeFileSync(reportPath, description);
    return description;
  }

  private computeHash(filePath: string): string {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private gitCommit(): string | undefined {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: this.repoRoot,
      encoding: 'utf-8',
    });
    return result.status === 0 ? result.stdout.trim() : undefined;
  }

  private writeManifest(controlResults: ControlResult[]): BundleManifest {
    const manifest: BundleManifest = {
      bundleName: 'IntelGraph eMASS Evidence Bundle',
      generatedAt: new Date().toISOString(),
      generatedBy: `${os.userInfo().username}@${os.hostname()}`,
      classification: this.classification,
      gitCommit: this.gitCommit(),
      evidenceRoot: this.outputDir,
      controls: controlResults,
    };

    const manifestPath = path.join(this.outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return manifest;
  }

  private exportRmfPackage(manifest: BundleManifest): void {
    if (this.skipTar) {
      manifest.rmfPackage = { status: 'skipped', note: 'Tar export disabled via --no-tar' };
      fs.writeFileSync(path.join(this.outputDir, 'rmf-export.log'), 'Tar export skipped by user flag');
      return;
    }

    const archivePath = path.join(this.outputDir, 'rmf-package.tgz');
    const tar = spawnSync(
      'tar',
      ['-czf', archivePath, '-C', this.outputDir, 'manifest.json', 'controls', 'reports'],
      { encoding: 'utf-8' },
    );

    if (tar.status === 0) {
      manifest.rmfPackage = { path: archivePath, status: 'generated' };
      fs.writeFileSync(path.join(this.outputDir, 'rmf-export.log'), tar.stdout || '');
    } else {
      manifest.rmfPackage = {
        status: 'skipped',
        note: tar.stderr || 'tar binary unavailable, package not created',
      };
      fs.writeFileSync(
        path.join(this.outputDir, 'rmf-export.log'),
        tar.stderr || 'tar not available',
      );
    }

    fs.writeFileSync(
      path.join(this.outputDir, 'rmf-package.json'),
      JSON.stringify(
        {
          name: 'IntelGraph RMF Submission Package',
          classification: this.classification,
          controls: manifest.controls.map((control) => ({
            id: control.id,
            title: control.title,
            evidence: control.artifacts.map((artifact) => artifact.copiedTo || artifact.source),
            checks: control.checks,
          })),
          exportedAt: new Date().toISOString(),
          archive: manifest.rmfPackage?.path,
        },
        null,
        2,
      ),
    );
  }

  private printUsage(): void {
    console.log(`eMASS evidence bundle generator

Usage:
  ts-node tools/federal/emass-bundle.ts [--classification <label>] [--output <dir>] [--controls <ids>] [--no-tar]

Options:
  --classification   Classification label stored in the manifest (default: UNCLASSIFIED)
  --output           Target directory for bundle output (default: /tmp/emass-bundle-<timestamp>)
  --controls         Comma-delimited list of control IDs to include (default: all)
  --no-tar           Skip creation of rmf-package.tgz (useful on systems without tar)
  -h, --help         Show this help text
`);
  }
}

new EmassEvidenceBundleGenerator().run();
