import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openApiSpec } from '../src/services/openapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output to server/public/openapi.json
const outputPath = path.resolve(__dirname, '../public/openapi.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));
console.log(`OpenAPI spec generated at ${outputPath}`);
