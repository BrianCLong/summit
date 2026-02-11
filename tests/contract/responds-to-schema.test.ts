import Ajv from 'ajv';
import { load } from 'js-yaml';
import fs from 'fs';
import fetch from 'node-fetch';

const ajv = new Ajv({ allErrors: true, strict: false });
const oas = load(fs.readFileSync('api/openapi.yaml', 'utf8')) as any;

it('GET /health matches schema', async () => {
  const res = await fetch(process.env.BASE_URL + '/health');
  const body = await res.json();
  const schema = oas.components.schemas.Health;
  const validate = ajv.compile(schema);
  expect(validate(body)).toBe(true);
});
