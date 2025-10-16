import fs from 'fs';
import Ajv from 'ajv';
const ajv = new Ajv();
const spec = JSON.parse(
  JSON.stringify(
    require('js-yaml').load(
      fs.readFileSync('.maestro/changespec.schema.yml', 'utf8'),
    ),
  ),
);
const data = require('js-yaml').load(
  fs.readFileSync('.changespec.yml', 'utf8'),
);
if (!ajv.validate(spec, data)) {
  console.error(ajv.errors);
  process.exit(1);
}
console.log('changespec ok');
