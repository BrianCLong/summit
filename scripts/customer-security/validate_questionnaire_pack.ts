import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Simple validation script to ensure YAML matches schema structure
// Ideally we would use ajv or similar, but for now we'll do basic checks.

const SOURCE_DIR = 'docs/customer-security/questionnaires';
const SCHEMA_PATH = 'schemas/customer-security/questionnaire.schema.json';

function validate() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const files = fs.readdirSync(SOURCE_DIR);
  let hasError = false;

  files.forEach(file => {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      console.log(`Validating ${file}...`);
      try {
        const content = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
        const data: any = yaml.load(content);

        if (!data.title || !data.version || !data.sections) {
          console.error(`ERROR: ${file} missing required fields.`);
          hasError = true;
        }

        // Basic Check
        if (!Array.isArray(data.sections)) {
             console.error(`ERROR: ${file} sections is not an array.`);
             hasError = true;
        }

      } catch (e: any) {
        console.error(`ERROR: ${file} is invalid YAML: ${e.message}`);
        hasError = true;
      }
    }
  });

  if (hasError) {
    process.exit(1);
  } else {
    console.log("All questionnaires validated successfully.");
  }
}

validate();
