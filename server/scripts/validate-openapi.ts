import { swaggerSpec } from '../src/config/swagger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function validateAndGenerate() {
  console.log('Validating OpenAPI Spec...');

  try {
    // Basic validation: Check if spec is an object and has required fields
    if (!swaggerSpec || typeof swaggerSpec !== 'object') {
      throw new Error('Swagger spec is not a valid object');
    }

    if (!swaggerSpec.openapi || !swaggerSpec.openapi.startsWith('3.')) {
      throw new Error('Swagger spec is missing openapi 3.x version');
    }

    if (!swaggerSpec.info || !swaggerSpec.info.title || !swaggerSpec.info.version) {
      throw new Error('Swagger spec is missing required info fields');
    }

    if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
      console.warn('Warning: No paths found in Swagger spec. Check if routes are correctly scanned.');
    }

    console.log('Spec passed basic validation.');

    // Generate JSON file
    const jsonPath = path.join(rootDir, 'openapi.json');
    fs.writeFileSync(jsonPath, JSON.stringify(swaggerSpec, null, 2));
    console.log(`Generated OpenAPI JSON at ${jsonPath}`);

    // Generate YAML file (simple conversion for now, or just use JSON)
    // For now, we stick to JSON as it's the native output of swagger-jsdoc

    console.log('Documentation generation complete.');
    process.exit(0);
  } catch (error) {
    console.error('Validation/Generation failed:', error);
    process.exit(1);
  }
}

validateAndGenerate();
