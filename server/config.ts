import fs from 'fs';
import yaml from 'js-yaml';
import Ajv from 'ajv';
const ajv = new Ajv();
const validate = ajv.compile(require('../config/app.schema.json'));
let cfg: any = yaml.load(fs.readFileSync('config/app.yaml', 'utf8'));
if (!validate(cfg)) throw new Error('Invalid config');
fs.watch('config/app.yaml', { persistent: false }, () => {
  try {
    const n = yaml.load(fs.readFileSync('config/app.yaml', 'utf8'));
    if (validate(n)) cfg = n;
  } catch (e) {
    console.error('cfg reload failed', e);
  }
});
export const getConfig = () => cfg;
