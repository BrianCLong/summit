import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({allErrors: true, allowUnionTypes: true});
addFormats(ajv);
const schema = JSON.parse(fs.readFileSync('workflow.schema.json','utf8'));

function loadYaml(file: string){
  // Minimal YAML loader stub; replace with 'yaml' pkg if desired
  const {parse} = require('yaml');
  return parse(fs.readFileSync(file,'utf8'));
}

describe('Workflow manifest schema', () => {
  it('validates example manifest', () => {
    const manifest = loadYaml('../examples/workflows/ingest-enrich-handoff.yaml');
    const validate = ajv.compile(schema);
    const ok = validate(manifest);
    if(!ok){
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });

  it('fails on missing policy fields', () => {
    const m = { apiVersion:'maestro/v1', kind:'Workflow', metadata:{name:'x',version:'1.0.0'}, spec:{ tasks:[]} } as any;
    const validate = ajv.compile(schema);
    expect(validate(m)).toBe(false);
  });
});
