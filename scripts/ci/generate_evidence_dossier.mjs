import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

const MAPPING_FILE = 'docs/ga/REGULATOR_MAPPING.yml';
const DOSSIER_ROOT = 'artifacts/dossiers';

function generateDossier() {
    if (!fs.existsSync(MAPPING_FILE)) {
        console.error(`Mapping file not found: ${MAPPING_FILE}`);
        process.exit(1);
    }

    const mapping = yaml.load(fs.readFileSync(MAPPING_FILE, 'utf-8'));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dossierDir = path.join(DOSSIER_ROOT, `dossier-${timestamp}`);

    fs.mkdirSync(dossierDir, { recursive: true });

    const report = {
        timestamp: new Date().toISOString(),
        controls: []
    };

    console.log(`Generating dossier in: ${dossierDir}`);

    for (const ctrl of mapping.mappings) {
        const controlDir = path.join(dossierDir, ctrl.framework, ctrl.control_id);
        fs.mkdirSync(controlDir, { recursive: true });

        const controlReport = {
            id: ctrl.control_id,
            framework: ctrl.framework,
            description: ctrl.description,
            evidence: []
        };

        for (const source of ctrl.evidence_sources) {
            // Simple glob handling (literal match or basic wildcard if we implement glob lib, 
            // but for this proof we'll assume direct paths or simple shell glob expansion via find/cp if needed.
            // For now, strict file check).
            // Actually, prompt implies "Automated Evidence Dossiers". 
            // We will copy the files into the dossier folder.

            const srcPath = source.path_pattern;
            if (fs.existsSync(srcPath)) {
                const destName = path.basename(srcPath);
                fs.copyFileSync(srcPath, path.join(controlDir, destName));
                controlReport.evidence.push({
                    file: destName,
                    rationale: source.rationale,
                    status: "PRESENT"
                });
            } else {
                controlReport.evidence.push({
                    file: srcPath,
                    rationale: source.rationale,
                    status: "MISSING"
                });
            }
        }
        report.controls.push(controlReport);
    }

    fs.writeFileSync(path.join(dossierDir, 'dossier_manifest.json'), JSON.stringify(report, null, 2));

    // Create Zip
    // Assuming zip is available, or we just leave as dir for artifact upload
    try {
        execSync(`zip -r dossier-${timestamp}.zip dossier-${timestamp}`, { cwd: DOSSIER_ROOT });
        console.log(`Dossier zipped: artifacts/dossiers/dossier-${timestamp}.zip`);
    } catch (e) {
        console.warn("Could not zip dossier (zip command missing?), leaving directory.");
    }
}

generateDossier();
