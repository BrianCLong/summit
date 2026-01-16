import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv();
addFormats(ajv);

const SCHEMA_PATH = path.join(process.cwd(), 'schemas/compliance/control_catalog.schema.json');
const CATALOG_PATH = path.join(process.cwd(), 'docs/compliance/control_catalog.yml');

function validateCatalog() {
  try {
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const catalogContent = fs.readFileSync(CATALOG_PATH, 'utf8');

    const schema = JSON.parse(schemaContent);
    const catalog = yaml.load(catalogContent);

    const validate = ajv.compile(schema);
    const valid = validate(catalog);

    if (!valid) {
      console.error('❌ Control Catalog validation failed:');
      console.error(validate.errors);
      process.exit(1);
    } else {
      console.log('✅ Control Catalog is valid.');
    }
  } catch (error) {
    console.error('❌ Error validating Control Catalog:', error);
    process.exit(1);
  }
}

validateCatalog();
