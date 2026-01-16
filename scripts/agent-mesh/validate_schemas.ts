import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMAS_DIR = path.resolve(__dirname, '../../schemas/agent-mesh');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

async function validateSchemas() {
  if (!fs.existsSync(SCHEMAS_DIR)) {
    console.error(`Schema directory not found: ${SCHEMAS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SCHEMAS_DIR).filter(f => f.endsWith('.json'));
  let success = true;

  console.log(`Validating schemas in ${SCHEMAS_DIR}...`);

  for (const file of files) {
    const filePath = path.join(SCHEMAS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const schema = JSON.parse(content);
      try {
          ajv.compile(schema);
          console.log(`✅ ${file} is valid`);
      } catch (compilationError) {
           console.error(`❌ ${file} schema compilation failed:`, compilationError.message);
           success = false;
      }

    } catch (error) {
      console.error(`❌ ${file} is invalid JSON:`, error.message);
      success = false;
    }
  }

  if (!success) {
    process.exit(1);
  }
}

validateSchemas();
