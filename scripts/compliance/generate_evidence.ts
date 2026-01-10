import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCommand, logger, handleExit } from '../_lib/cli.js';
import { ArtifactManager } from '../_lib/artifacts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
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

async function generateEvidence(options: any) {
  const { control, startDate, endDate, outDir, mode, json, verbose } = options;
  const artifactManager = new ArtifactManager(outDir);

  logger.section('Evidence Generation');
  logger.info(`Mode: ${mode}`);
  logger.verbose(verbose, `Root Dir: ${ROOT_DIR}`);

  const controls = parseControlMap();
  logger.info(`Loaded ${controls.length} controls from map.`);

  if (mode === 'plan') {
      logger.success('Plan mode: parsed controls successfully. Would generate evidence for:');
      const controlsToProcess = control
        ? controls.filter(c => c.controlId === control)
        : controls;

      controlsToProcess.forEach(c => console.log(` - ${c.controlId}: ${c.description}`));
      return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bundleName = `auditor-bundle-${timestamp}`;
  // Use artifacts manager to create directory structure
  // artifacts/evidence/auditor-bundle-DATE/
  const bundlePath = artifactManager.ensureDir(path.join('evidence', bundleName));

  const controlsToProcess = control
    ? controls.filter(c => c.controlId === control)
    : controls;

  if (controlsToProcess.length === 0 && control) {
    throw new Error(`Control ${control} not found.`);
  }

  for (const ctrl of controlsToProcess) {
    const controlDir = path.join(bundlePath, ctrl.controlId);
    fs.mkdirSync(controlDir, { recursive: true });

    // Create a metadata file for the control
    const metadata = {
      controlId: ctrl.controlId,
      description: ctrl.description,
      generatedAt: new Date().toISOString(),
      scope: { startDate, endDate }
    };
    fs.writeFileSync(path.join(controlDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Copy artifacts (Simulated)
    for (const artifact of ctrl.artifacts) {
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
    parameters: { control, startDate, endDate }
  };
  fs.writeFileSync(path.join(bundlePath, 'manifest.json'), JSON.stringify(manifest, null, 2));

  logger.success(`Evidence bundle generated at: ${bundlePath}`);
  if (json) {
      logger.json({
          status: 'success',
          bundlePath,
          manifest
      });
  }
}

const program = createCommand('evidence:generate', 'Generates compliance evidence bundle');

program
  .option('--control <id>', 'Specific control ID to generate evidence for')
  .option('--start-date <date>', 'Start date for evidence collection')
  .option('--end-date <date>', 'End date for evidence collection')
  .action(async (options) => {
    try {
      await generateEvidence(options);
    } catch (error: any) {
      handleExit(1, error);
    }
  });

program.parse(process.argv);
