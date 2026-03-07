import Ajv from 'ajv/dist/2020';
import * as fs from 'fs';
import * as path from 'path';

const ajv = new Ajv();
const schemaPath = path.join(__dirname, '../../schemas/evolution/signal.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

describe('Signal Contract', () => {
  it('validates a correct signal', () => {
    const fixturePath = path.join(__dirname, '../../evolution/fixtures/signals/sample-investigation-dead-end.json');
    const signal = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const valid = validate(signal);
    expect(valid).toBe(true);
  });
});
