import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OVERLAYS_DIR = path.join(__dirname, '../../deployment/overlays');

interface Kustomization {
  resources?: string[];
  patches?: any[];
  commonLabels?: Record<string, string>;
}

function validateOverlays() {
  const overlays = ['baseline-secure', 'dev-secure', 'stage-secure', 'prod-secure'];
  let hasError = false;

  overlays.forEach(overlay => {
    const dir = path.join(OVERLAYS_DIR, overlay);
    const kustomizationPath = path.join(dir, 'kustomization.yaml');

    if (!fs.existsSync(kustomizationPath)) {
      console.error(`❌ Missing kustomization.yaml in ${overlay}`);
      hasError = true;
      return;
    }

    try {
      const content = fs.readFileSync(kustomizationPath, 'utf8');
      const kustomization = yaml.load(content) as Kustomization;

      // Basic validation
      if (overlay === 'baseline-secure') {
        if (!kustomization.patches || kustomization.patches.length === 0) {
          console.error(`❌ baseline-secure must have security patches`);
          hasError = true;
        }
      } else {
        if (!kustomization.resources || !kustomization.resources.includes('../baseline-secure')) {
          console.error(`❌ ${overlay} must inherit from ../baseline-secure`);
          hasError = true;
        }
      }

      console.log(`✅ ${overlay} validated`);

    } catch (e) {
      console.error(`❌ Failed to parse ${kustomizationPath}:`, e);
      hasError = true;
    }
  });

  if (hasError) {
    process.exit(1);
  }
}

validateOverlays();
