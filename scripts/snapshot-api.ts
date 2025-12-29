
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Define paths
const OPENAPI_PATH = path.join(process.cwd(), 'docs', 'api-spec.yaml');

/**
 * Normalizes an object by sorting its keys recursively.
 * This ensures that the snapshot is deterministic.
 */
function normalize(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalize);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalize(obj[key]);
        return acc;
      }, {} as any);
  }
  return obj;
}

/**
 * Extracts and normalizes the API snapshot.
 * Reads from docs/api-spec.yaml.
 */
export function extractSnapshot(sourcePath: string = OPENAPI_PATH): string {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`OpenAPI spec not found at ${sourcePath}`);
  }

  const fileContent = fs.readFileSync(sourcePath, 'utf8');
  let spec: any;

  try {
    // Try parsing as YAML first, since the file extension is .yaml
    spec = yaml.load(fileContent);
  } catch (e) {
    // Fallback to JSON if YAML parsing fails (unlikely given extension)
    try {
      spec = JSON.parse(fileContent);
    } catch (e2) {
      throw new Error(`Failed to parse OpenAPI spec at ${sourcePath}: ${e}`);
    }
  }

  const normalizedSpec = normalize(spec);
  return JSON.stringify(normalizedSpec, null, 2);
}

// Main execution block
// Helper to check if file is main in ESM environment where we might want to run this script directly.
// We use a check on process.argv to detect if this file is being executed as the main script.
if (process.argv[1].endsWith('snapshot-api.ts')) {
  try {
    const snapshot = extractSnapshot();
    console.log(snapshot);
  } catch (error) {
    console.error('Error generating snapshot:', error);
    process.exit(1);
  }
}
