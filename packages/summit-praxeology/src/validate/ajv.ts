import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import actionSchema from '../schemas/pg.action.schema.json';
import playbookSchema from '../schemas/pg.playbook.schema.json';
import hypothesisSchema from '../schemas/pg.hypothesis.schema.json';
import writeSetSchema from '../schemas/pg.writeset.schema.json';

export function makeAjv() {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
  });

  addFormats(ajv);

  ajv.addSchema(actionSchema);
  ajv.addSchema(playbookSchema);
  ajv.addSchema(hypothesisSchema);
  ajv.addSchema(writeSetSchema);

  return ajv;
}
