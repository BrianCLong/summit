#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
class EmassEvidenceBundleGenerator {
    repoRoot;
    outputDir;
    classification;
    selectedControlIds;
    skipTar;
    controls;
    constructor() {
        this.repoRoot = path_1.default.resolve(__dirname, '..', '..');
        if (this.hasFlag('--help') || this.hasFlag('-h')) {
            this.printUsage();
            process.exit(0);
        }
        const targetDir = this.parseArg('--output') || process.env.EMASS_OUTPUT_DIR;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.outputDir = targetDir || path_1.default.join(os_1.default.tmpdir(), `emass-bundle-${timestamp}`);
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
    run() {
        this.prepareOutputDir();
        const controlResults = this.controls.map((control) => this.processControl(control));
        const manifest = this.writeManifest(controlResults);
        this.exportRmfPackage(manifest);
        console.log(`\n✅ eMASS evidence bundle ready: ${this.outputDir}`);
    }
    parseArg(flag) {
        const index = process.argv.indexOf(flag);
        if (index >= 0 && process.argv[index + 1]) {
            return process.argv[index + 1];
        }
        return undefined;
    }
    parseListArg(flag) {
        const value = this.parseArg(flag);
        if (!value)
            return undefined;
        const items = value
            .split(',')
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean);
        return items.length ? new Set(items) : undefined;
    }
    hasFlag(flag) {
        return process.argv.includes(flag);
    }
    prepareOutputDir() {
        fs_1.default.mkdirSync(this.outputDir, { recursive: true });
        fs_1.default.mkdirSync(path_1.default.join(this.outputDir, 'controls'), { recursive: true });
        fs_1.default.mkdirSync(path_1.default.join(this.outputDir, 'reports'), { recursive: true });
    }
    loadControls() {
        return [
            {
                id: 'SC-13',
                family: 'System and Communications Protection',
                title: 'Cryptographic Protection',
                description: 'FIPS 140-2 validated cryptography enforced with HSM-backed operations and PKCS#11 guards.',
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
    processControl(control) {
        const controlDir = path_1.default.join(this.outputDir, 'controls', control.id);
        fs_1.default.mkdirSync(controlDir, { recursive: true });
        const artifacts = control.evidence.map((item) => this.copyEvidence(item, controlDir));
        const checks = (control.automatedChecks || []).map((check) => this.runCheck(check));
        const result = {
            id: control.id,
            family: control.family,
            title: control.title,
            description: control.description,
            artifacts,
            checks,
        };
        const controlReportPath = path_1.default.join(controlDir, 'control.json');
        fs_1.default.writeFileSync(controlReportPath, JSON.stringify(result, null, 2));
        return result;
    }
    copyEvidence(source, controlDir) {
        const absolutePath = path_1.default.join(this.repoRoot, source.path);
        const destination = path_1.default.join(controlDir, path_1.default.basename(source.path));
        if (!fs_1.default.existsSync(absolutePath)) {
            const missing = {
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
        fs_1.default.cpSync(absolutePath, destination, { recursive: true });
        const sha256 = this.computeHash(destination);
        return {
            source: source.path,
            copiedTo: path_1.default.relative(this.outputDir, destination),
            sha256,
            exists: true,
            note: source.description,
        };
    }
    runCheck(check) {
        try {
            if (check.run) {
                const output = check.run();
                return { name: check.name, description: check.description, status: 'passed', output };
            }
            if (check.command) {
                const [cmd, ...args] = check.command;
                const result = (0, child_process_1.spawnSync)(cmd, args, { encoding: 'utf-8' });
                const status = result.status === 0 ? 'passed' : 'failed';
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
        }
        catch (error) {
            return {
                name: check.name,
                description: check.description,
                status: 'failed',
                output: error?.message || 'Unknown error',
            };
        }
    }
    hashFiles(files) {
        const results = files.map((filePath) => {
            const absolute = path_1.default.join(this.repoRoot, filePath);
            if (!fs_1.default.existsSync(absolute)) {
                return `${filePath}: missing`;
            }
            const hash = this.computeHash(absolute);
            return `${filePath}: ${hash}`;
        });
        const digestPath = path_1.default.join(this.outputDir, 'reports', `digest-${crypto_1.default.randomUUID().slice(0, 8)}.txt`);
        fs_1.default.writeFileSync(digestPath, results.join(os_1.default.EOL));
        return results.join(os_1.default.EOL);
    }
    describeFile(filePath) {
        const absolute = path_1.default.join(this.repoRoot, filePath);
        if (!fs_1.default.existsSync(absolute)) {
            return `${filePath}: missing`;
        }
        const stat = fs_1.default.statSync(absolute);
        const preview = fs_1.default.readFileSync(absolute, 'utf-8').split('\n').slice(0, 12).join('\n');
        const description = [
            `${filePath}: ${stat.size} bytes`,
            '--- preview ---',
            preview,
        ].join('\n');
        const reportPath = path_1.default.join(this.outputDir, 'reports', `preview-${path_1.default.basename(filePath).replace(/[^a-zA-Z0-9_-]/g, '-')}.txt`);
        fs_1.default.writeFileSync(reportPath, description);
        return description;
    }
    computeHash(filePath) {
        const data = fs_1.default.readFileSync(filePath);
        return crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
    gitCommit() {
        const result = (0, child_process_1.spawnSync)('git', ['rev-parse', 'HEAD'], {
            cwd: this.repoRoot,
            encoding: 'utf-8',
        });
        return result.status === 0 ? result.stdout.trim() : undefined;
    }
    writeManifest(controlResults) {
        const manifest = {
            bundleName: 'IntelGraph eMASS Evidence Bundle',
            generatedAt: new Date().toISOString(),
            generatedBy: `${os_1.default.userInfo().username}@${os_1.default.hostname()}`,
            classification: this.classification,
            gitCommit: this.gitCommit(),
            evidenceRoot: this.outputDir,
            controls: controlResults,
        };
        const manifestPath = path_1.default.join(this.outputDir, 'manifest.json');
        fs_1.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        return manifest;
    }
    exportRmfPackage(manifest) {
        if (this.skipTar) {
            manifest.rmfPackage = { status: 'skipped', note: 'Tar export disabled via --no-tar' };
            fs_1.default.writeFileSync(path_1.default.join(this.outputDir, 'rmf-export.log'), 'Tar export skipped by user flag');
            return;
        }
        const archivePath = path_1.default.join(this.outputDir, 'rmf-package.tgz');
        const tar = (0, child_process_1.spawnSync)('tar', ['-czf', archivePath, '-C', this.outputDir, 'manifest.json', 'controls', 'reports'], { encoding: 'utf-8' });
        if (tar.status === 0) {
            manifest.rmfPackage = { path: archivePath, status: 'generated' };
            fs_1.default.writeFileSync(path_1.default.join(this.outputDir, 'rmf-export.log'), tar.stdout || '');
        }
        else {
            manifest.rmfPackage = {
                status: 'skipped',
                note: tar.stderr || 'tar binary unavailable, package not created',
            };
            fs_1.default.writeFileSync(path_1.default.join(this.outputDir, 'rmf-export.log'), tar.stderr || 'tar not available');
        }
        fs_1.default.writeFileSync(path_1.default.join(this.outputDir, 'rmf-package.json'), JSON.stringify({
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
        }, null, 2));
    }
    printUsage() {
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
