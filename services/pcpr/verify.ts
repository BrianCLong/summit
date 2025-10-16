import Ajv from 'ajv';
import schema from './pcpr.schema.json';
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);
export function verify(ob: any) {
  if (!validate(ob))
    throw new Error('PCPR fail: ' + JSON.stringify(validate.errors));
  return true;
}
