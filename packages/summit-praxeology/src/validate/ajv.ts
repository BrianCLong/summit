import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

import actionSchema from '../schemas/pg.action.schema.json';
import playbookSchema from '../schemas/pg.playbook.schema.json';
import hypothesisSchema from '../schemas/pg.hypothesis.schema.json';

export function makeAjv() {
  const ajv = new Ajv({
    allErrors: true,
    strict: true
  });

  addFormats(ajv);

  ajv.addSchema(actionSchema);
  ajv.addSchema(playbookSchema);
  ajv.addSchema(hypothesisSchema);

  return ajv;
}
