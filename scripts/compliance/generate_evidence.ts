import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simulation of evidence generation script
// Parses compliance/control-map.yaml dynamically.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const EVIDENCE_DIR = process.env.EVIDENCE_OUTPUT_DIR || path.join(ROOT_DIR, 'evidence');
const CONTROL_MAP_PATH = path.join(ROOT_DIR, 'compliance/control-map.yaml');

interface ControlEvidence {
  controlId: string;
  description: string;
  artifacts: string[];
}

function parseControlMap(): ControlEvidence[] {
  if (!fs.existsSync(CONTROL_MAP_PATH)) {
    throw new Error(`Control map not found at ${CONTROL_MAP_PATH}`);
  }

  const content = fs.readFileSync(CONTROL_MAP_PATH, 'utf8');
  const lines = content.split('\n');
  const controls: ControlEvidence[] = [];

  let currentControl: Partial<ControlEvidence> | null = null;
  let inControlsBlock = false;
  let inArtifactsBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect start of controls block
    if (trimmed === 'controls:') {
      inControlsBlock = true;
      continue;
    }

    if (!inControlsBlock) continue;

    // Detect new control ID (e.g., "  CC1.1:")
    const controlIdMatch = line.match(/^  ([A-Z0-9.]+):/);
    if (controlIdMatch) {
      if (currentControl && currentControl.controlId) {
        controls.push(currentControl as ControlEvidence);
      }
      currentControl = { controlId: controlIdMatch[1], artifacts: [], description: '' };
      inArtifactsBlock = false;
      continue;
    }

    if (!currentControl) continue;

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
    controls.push(currentControl as ControlEvidence);
  }

  return controls;
}

async function generateEvidence(controlId?: string, startDate?: string, endDate?: string) {
  console.log(`Generating evidence... Control: ${controlId || 'ALL'}, Range: ${startDate || 'N/A'} - ${endDate || 'N/A'}`);
  console.log(`Root Dir: ${ROOT_DIR}`);

  const controls = parseControlMap();
  console.log(`Loaded ${controls.length} controls from map.`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bundleName = `auditor-bundle-${timestamp}`;
  // If EVIDENCE_OUTPUT_DIR is set, treat it as the bundle path directly if it ends in bundle name,
  // or just use it as base. For simplicity, if env is set, we use it as the specific bundle directory
  // to ensure deterministic output paths for CI.
  const bundlePath = process.env.EVIDENCE_OUTPUT_DIR
    ? process.env.EVIDENCE_OUTPUT_DIR
    : path.join(EVIDENCE_DIR, bundleName);

  if (!fs.existsSync(path.dirname(bundlePath))) {
    fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  }
  fs.mkdirSync(bundlePath, { recursive: true });

  const controlsToProcess = controlId
    ? controls.filter(c => c.controlId === controlId)
    : controls;

  if (controlsToProcess.length === 0 && controlId) {
    console.error(`Control ${controlId} not found.`);
    return;
  }

  for (const control of controlsToProcess) {
    const controlDir = path.join(bundlePath, control.controlId);
    fs.mkdirSync(controlDir, { recursive: true });

    // Create a metadata file for the control
    const metadata = {
      controlId: control.controlId,
      description: control.description,
      generatedAt: new Date().toISOString(),
      scope: { startDate, endDate }
    };
    fs.writeFileSync(path.join(controlDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Copy artifacts (Simulated)
    for (const artifact of control.artifacts) {
      const sourcePath = path.join(ROOT_DIR, artifact);
      const destPath = path.join(controlDir, path.basename(artifact));

      if (fs.existsSync(sourcePath)) {
        // Simple file copy for doc artifacts
        if (fs.lstatSync(sourcePath).isFile()) {
           fs.copyFileSync(sourcePath, destPath);
        } else {
           fs.writeFileSync(destPath + '.snapshot', `Directory snapshot of ${artifact} captured.`);
        }
      } else {
        fs.writeFileSync(destPath + '.missing', `Artifact ${artifact} not found at time of generation: ${sourcePath}`);
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
  fs.writeFileSync(path.join(bundlePath, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Evidence bundle generated at: ${bundlePath}`);
}

// Simple CLI parsing
const args = process.argv.slice(2);
let controlIdArg: string | undefined;
let startDateArg: string | undefined;
let endDateArg: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--control') controlIdArg = args[i + 1];
  if (args[i] === '--start-date') startDateArg = args[i + 1];
  if (args[i] === '--end-date') endDateArg = args[i + 1];
}

generateEvidence(controlIdArg, startDateArg, endDateArg).catch(console.error);
