import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv();
addFormats(ajv);

const SCHEMA_PATH = path.join(process.cwd(), 'schemas/compliance/control_evidence_map.schema.json');
const MAP_PATH = path.join(process.cwd(), 'docs/compliance/control_evidence_map.yml');

function validateMap() {
  try {
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const mapContent = fs.readFileSync(MAP_PATH, 'utf8');

    const schema = JSON.parse(schemaContent);
    const map = yaml.load(mapContent);

    const validate = ajv.compile(schema);
    const valid = validate(map);

    if (!valid) {
      console.error('❌ Control Evidence Map validation failed:');
      console.error(validate.errors);
      process.exit(1);
    } else {
      console.log('✅ Control Evidence Map is valid.');
    }
  } catch (error) {
    console.error('❌ Error validating Control Evidence Map:', error);
    process.exit(1);
  }
}

validateMap();
