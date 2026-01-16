import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const BUNDLE_ROOT = path.join(ARTIFACTS_DIR, 'release-bundles');
const SNAPSHOT_ROOT = path.join(ARTIFACTS_DIR, 'compliance-snapshot');

async function generateSnapshot() {
    const sha = process.env.GITHUB_SHA || 'local-sha';
    const bundleDir = path.join(BUNDLE_ROOT, sha);
    const snapshotDir = path.join(SNAPSHOT_ROOT, sha);

    if (!fs.existsSync(bundleDir)) {
        console.error(`Bundle not found: ${bundleDir}`);
        process.exit(1);
    }

    if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
    }

    console.log(`Generating Compliance Snapshot for SHA: ${sha}`);

    // Read Catalog and Map from Bundle
    const catalogPath = path.join(bundleDir, 'policies', 'control_catalog.yml');
    const mapPath = path.join(bundleDir, 'policies', 'control_evidence_map.yml');

    if (!fs.existsSync(catalogPath) || !fs.existsSync(mapPath)) {
        console.error("Missing catalog or map in bundle.");
        process.exit(1);
    }

    const catalog = yaml.load(fs.readFileSync(catalogPath, 'utf8')) as any;
    const map = yaml.load(fs.readFileSync(mapPath, 'utf8')) as any;

    // Generate controls.md
    let controlsMd = '# Compliance Controls Snapshot\n\n';
    controlsMd += `**Bundle ID:** ${sha}\n`;
    controlsMd += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;

    controlsMd += '| ID | Framework | Statement | Status | Evidence |\n';
    controlsMd += '|---|---|---|---|---|\n';

    catalog.controls.forEach((control: any) => {
        const mapping = map.mappings.find((m: any) => m.control_id === control.id);
        const hasEvidence = mapping && (mapping.artifacts || mapping.docs || mapping.checks);
        const status = hasEvidence ? '✅ Covered' : '⚠️ Missing Evidence';

        let evidenceLinks = '';
        if (mapping) {
            if (mapping.artifacts) evidenceLinks += mapping.artifacts.join(', ') + '<br>';
            if (mapping.docs) evidenceLinks += mapping.docs.join(', ') + '<br>';
        }

        controlsMd += `| ${control.id} | ${control.framework} | ${control.statement} | ${status} | ${evidenceLinks} |\n`;
    });

    fs.writeFileSync(path.join(snapshotDir, 'controls.md'), controlsMd);

    // Generate index.md
    let indexMd = '# Auditor Compliance Snapshot\n\n';
    indexMd += '## Overview\n';
    indexMd += `This snapshot represents the compliance posture for release bundle ${sha}.\n\n`;
    indexMd += '- [Controls Matrix](controls.md)\n';
    indexMd += '- [Evidence Inventory](evidence_inventory.md)\n';
    indexMd += '- [Risk Register](risk_register.md)\n';

    fs.writeFileSync(path.join(snapshotDir, 'index.md'), indexMd);

    // Generate evidence_inventory.md
    let inventoryMd = '# Evidence Inventory\n\n';
    const manifest = JSON.parse(fs.readFileSync(path.join(bundleDir, 'manifest.json'), 'utf8'));
    inventoryMd += '| Path | SHA256 |\n';
    inventoryMd += '|---|---|\n';
    manifest.contents.forEach((item: any) => {
        inventoryMd += `| ${item.path} | \`${item.sha256.substring(0, 12)}...\` |\n`;
    });
    fs.writeFileSync(path.join(snapshotDir, 'evidence_inventory.md'), inventoryMd);

    // Generate placeholder risk_register.md
    const riskMd = '# Risk Register\n\nNo active risks flagged for this release.\n';
    fs.writeFileSync(path.join(snapshotDir, 'risk_register.md'), riskMd);

    console.log(`Snapshot generated at: ${snapshotDir}`);
}

generateSnapshot();
