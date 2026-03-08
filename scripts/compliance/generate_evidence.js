"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// Simulation of evidence generation script
// Parses compliance/control-map.yaml dynamically.
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const ROOT_DIR = path_1.default.resolve(__dirname, '../../');
const EVIDENCE_DIR = path_1.default.join(ROOT_DIR, 'evidence');
const CONTROL_MAP_PATH = path_1.default.join(ROOT_DIR, 'compliance/control-map.yaml');
function parseControlMap() {
    if (!fs_1.default.existsSync(CONTROL_MAP_PATH)) {
        throw new Error(`Control map not found at ${CONTROL_MAP_PATH}`);
    }
    const content = fs_1.default.readFileSync(CONTROL_MAP_PATH, 'utf8');
    const lines = content.split('\n');
    const controls = [];
    let currentControl = null;
    let inControlsBlock = false;
    let inArtifactsBlock = false;
    for (const line of lines) {
        const trimmed = line.trim();
        // Detect start of controls block
        if (trimmed === 'controls:') {
            inControlsBlock = true;
            continue;
        }
        if (!inControlsBlock)
            continue;
        // Detect new control ID (e.g., "  CC1.1:")
        const controlIdMatch = line.match(/^  ([A-Z0-9.]+):/);
        if (controlIdMatch) {
            if (currentControl && currentControl.controlId) {
                controls.push(currentControl);
            }
            currentControl = { controlId: controlIdMatch[1], artifacts: [], description: '' };
            inArtifactsBlock = false;
            continue;
        }
        if (!currentControl)
            continue;
        // Extract description
        const descMatch = line.match(/^    description:\s*["']?(.*?)["']?$/);
        if (descMatch) {
            currentControl.description = descMatch[1];
            inArtifactsBlock = false;
        }
        // Detect artifacts block
        if (trimmed.startsWith('summit_artifacts:')) {
            inArtifactsBlock = true;
            continue;
        }
        // Detect other blocks (stop artifacts)
        if (trimmed.startsWith('evidence:') || trimmed.startsWith('status:') || trimmed.startsWith('owner:')) {
            inArtifactsBlock = false;
            continue;
        }
        // Extract artifacts
        if (inArtifactsBlock) {
            const artifactMatch = line.match(/^      -\s*["']?(.*?)["']?$/);
            if (artifactMatch) {
                currentControl.artifacts?.push(artifactMatch[1]);
            }
        }
    }
    // Push the last control
    if (currentControl && currentControl.controlId) {
        controls.push(currentControl);
    }
    return controls;
}
async function generateEvidence(controlId, startDate, endDate) {
    console.log(`Generating evidence... Control: ${controlId || 'ALL'}, Range: ${startDate || 'N/A'} - ${endDate || 'N/A'}`);
    console.log(`Root Dir: ${ROOT_DIR}`);
    const controls = parseControlMap();
    console.log(`Loaded ${controls.length} controls from map.`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bundleName = `auditor-bundle-${timestamp}`;
    const bundlePath = path_1.default.join(EVIDENCE_DIR, bundleName);
    if (!fs_1.default.existsSync(EVIDENCE_DIR)) {
        fs_1.default.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
    fs_1.default.mkdirSync(bundlePath, { recursive: true });
    const controlsToProcess = controlId
        ? controls.filter(c => c.controlId === controlId)
        : controls;
    if (controlsToProcess.length === 0 && controlId) {
        console.error(`Control ${controlId} not found.`);
        return;
    }
    for (const control of controlsToProcess) {
        const controlDir = path_1.default.join(bundlePath, control.controlId);
        fs_1.default.mkdirSync(controlDir, { recursive: true });
        // Create a metadata file for the control
        const metadata = {
            controlId: control.controlId,
            description: control.description,
            generatedAt: new Date().toISOString(),
            scope: { startDate, endDate }
        };
        fs_1.default.writeFileSync(path_1.default.join(controlDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
        // Copy artifacts (Simulated)
        for (const artifact of control.artifacts) {
            const sourcePath = path_1.default.join(ROOT_DIR, artifact);
            const destPath = path_1.default.join(controlDir, path_1.default.basename(artifact));
            if (fs_1.default.existsSync(sourcePath)) {
                // Simple file copy for doc artifacts
                if (fs_1.default.lstatSync(sourcePath).isFile()) {
                    fs_1.default.copyFileSync(sourcePath, destPath);
                }
                else {
                    fs_1.default.writeFileSync(destPath + '.snapshot', `Directory snapshot of ${artifact} captured.`);
                }
            }
            else {
                fs_1.default.writeFileSync(destPath + '.missing', `Artifact ${artifact} not found at time of generation: ${sourcePath}`);
            }
        }
    }
    // Create manifest
    const manifest = {
        bundleId: bundleName,
        generatedAt: new Date().toISOString(),
        controlsIncluded: controlsToProcess.map(c => c.controlId),
        parameters: { controlId, startDate, endDate }
    };
    fs_1.default.writeFileSync(path_1.default.join(bundlePath, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Evidence bundle generated at: ${bundlePath}`);
}
// Simple CLI parsing
const args = process.argv.slice(2);
let controlIdArg;
let startDateArg;
let endDateArg;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--control')
        controlIdArg = args[i + 1];
    if (args[i] === '--start-date')
        startDateArg = args[i + 1];
    if (args[i] === '--end-date')
        endDateArg = args[i + 1];
}
generateEvidence(controlIdArg, startDateArg, endDateArg).catch(console.error);
